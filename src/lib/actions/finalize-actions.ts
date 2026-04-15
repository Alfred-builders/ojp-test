"use server";

import { createClient } from "@/lib/supabase/server";
import { generateAndStoreDocument } from "@/lib/pdf/generate-and-store";
import { getSettingServer } from "@/lib/settings-server";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import type {
  ClientInfo,
  DossierInfo,
  ReferenceLigne,
  TotauxInfo,
  DepotVenteReferenceLigne,
  ConfieReferenceLigne,
  FactureVenteLigne,
  QuittanceDepotVenteLigne,
} from "@/lib/pdf";

const RETRACTATION_DELAY_MS = 48 * 60 * 60 * 1000;

import { sendNotification } from "@/lib/email/send-notification";
import type { EmailNotificationType } from "@/types/email";

export interface FinaliseResult {
  success: boolean;
  error?: string;
}

interface InternalResult {
  success: boolean;
  error?: string;
  emailTriggers?: EmailTrigger[];
}

interface EmailTrigger {
  type: EmailNotificationType;
  lotId: string;
  dossierId: string;
  clientId: string;
  paths: string[];
}

type SB = Awaited<ReturnType<typeof createClient>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ref = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VenteLigne = any;

/* ──────────────────────── AUTO-PROCESS EXPIRED RETRACTATION ──── */

/**
 * Server-side: auto-process any expired retractation refs for a dossier.
 * Called from the dossier detail page server component BEFORE rendering.
 */
export async function autoProcessExpiredRetractation(dossierId: string): Promise<void> {
  const supabase = await createClient();
  const now = new Date();

  // Find lots in en_cours for this dossier
  const { data: lots } = await supabase
    .from("lots")
    .select("id, type, status")
    .eq("dossier_id", dossierId)
    .in("type", ["rachat", "depot_vente"])
    .eq("status", "en_cours");

  if (!lots || lots.length === 0) return;

  for (const lot of lots) {
    // Atomically claim expired refs by updating status (prevents double-processing)
    const { data: expiredRefs } = await supabase
      .from("lot_references")
      .update({ status: "en_attente_paiement" })
      .eq("lot_id", lot.id)
      .eq("status", "en_retractation")
      .lte("date_fin_delai", now.toISOString())
      .select("*");

    if (!expiredRefs || expiredRefs.length === 0) {
      // No expired refs to process, but still check if lot should be finalized
      // (e.g. all refs were finalized by payments but lot status wasn't updated)
      const { data: allRefs } = await supabase
        .from("lot_references")
        .select("status")
        .eq("lot_id", lot.id);

      const terminalStatuses = ["finalise", "devis_refuse", "retracte", "rendu_client", "vendu"];
      const allTerminal = (allRefs ?? []).every(
        (r: { status: string }) => terminalStatuses.includes(r.status)
      );

      if (allTerminal) {
        await supabase.from("lots").update({
          status: "finalise", outcome: "complete", date_finalisation: now.toISOString(),
        }).eq("id", lot.id);
      }
      continue;
    }

    const isDepotVente = lot.type === "depot_vente";

    // Sign contracts
    await supabase
      .from("documents")
      .update({ status: "signe" })
      .eq("lot_id", lot.id)
      .in("type", ["contrat_rachat", "contrat_depot_vente", "confie_achat"])
      .eq("status", "en_attente");

    // Generate one quittance per signed contract (each contract = its own refs)
    if (!isDepotVente && expiredRefs.length > 0) {
      const { data: dossier } = await supabase
        .from("dossiers")
        .select("*, client:clients(*)")
        .eq("id", dossierId)
        .single();

      if (dossier) {
        const { data: lotData } = await supabase.from("lots").select("numero").eq("id", lot.id).single();
        const clientInfo = buildClientInfo(dossier);
        const dossierInfo = buildDossierInfo(dossier, { numero: lotData?.numero ?? "" }, now);

        // Get signed contracts and their linked refs
        const { data: signedContrats } = await supabase
          .from("documents")
          .select("id, document_references(lot_reference_id)")
          .eq("lot_id", lot.id)
          .eq("type", "contrat_rachat")
          .eq("status", "signe");

        const expiredRefIds = new Set(expiredRefs.map((r: Ref) => r.id));

        for (const contrat of signedContrats ?? []) {
          const contratRefIds = (contrat.document_references ?? [])
            .map((dr: { lot_reference_id: string }) => dr.lot_reference_id)
            .filter((id: string) => expiredRefIds.has(id));

          if (contratRefIds.length === 0) continue;

          // Check if a quittance already exists for these refs (idempotency)
          const { data: existingDocRefs } = await supabase
            .from("document_references")
            .select("document_id")
            .in("lot_reference_id", contratRefIds);
          const linkedDocIds = [...new Set((existingDocRefs ?? []).map((dr: { document_id: string }) => dr.document_id))];
          if (linkedDocIds.length > 0) {
            const { data: linkedDocs } = await supabase
              .from("documents")
              .select("type")
              .in("id", linkedDocIds)
              .eq("type", "quittance_rachat")
              .limit(1);
            if (linkedDocs && linkedDocs.length > 0) continue;
          }

          const contratRefs = expiredRefs.filter((r: Ref) => contratRefIds.includes(r.id));
          const refLignes: ReferenceLigne[] = contratRefs.map((r: Ref) => ({
            designation: r.designation,
            metal: r.metal ?? "—",
            titrage: r.qualite ?? "—",
            poids: r.poids_net ?? r.poids ?? 0,
            quantite: r.quantite,
            taxe: r.montant_taxe > 0 ? (r.regime_fiscal === "TFOP" ? "6.5%" : r.regime_fiscal === "TPV" ? "TPV" : "11.5%") : "0%",
            prixUnitaire: r.prix_achat,
            prixTotal: r.prix_achat * r.quantite,
          }));

          const qResult = await genDoc({
            type: "quittance_rachat",
            lotId: lot.id,
            dossierId,
            clientId: dossier.client.id,
            client: clientInfo,
            dossier: dossierInfo,
            references: refLignes,
            totaux: buildTotaux(contratRefs),
            lotReferenceIds: contratRefIds,
          }, "quittance_rachat");
          if (qResult.error) {
            console.error(`[AUTO-RETRACT] Quittance generation failed for contrat ${contrat.id}:`, qResult.error);
          }
        }
      }
    }

    // Check if lot can be finalized (only if all refs are terminal)
    const { data: allRefs } = await supabase
      .from("lot_references")
      .select("status")
      .eq("lot_id", lot.id);

    const terminalStatuses = ["finalise", "devis_refuse", "retracte", "rendu_client", "vendu"];
    const allTerminal = (allRefs ?? []).every(
      (r: { status: string }) => terminalStatuses.includes(r.status)
    );

    if (allTerminal) {
      await supabase.from("lots").update({
        status: "finalise", outcome: "complete", date_finalisation: now.toISOString(),
      }).eq("id", lot.id);
    }
  }

  // Check if dossier can be finalized
  const { data: allLots } = await supabase
    .from("lots")
    .select("status")
    .eq("dossier_id", dossierId);

  if ((allLots ?? []).every((l: { status: string }) => l.status === "finalise")) {
    await supabase.from("dossiers").update({ status: "finalise" }).eq("id", dossierId);
  }
}

/* ──────────────────────── PUBLIC ACTIONS ──────────────────────── */

export async function finaliserDossierAction(dossierId: string): Promise<FinaliseResult> {
  try {
    const supabase = await createClient();

    const { data: dossier, error: dossierErr } = await supabase
      .from("dossiers")
      .select("*, client:clients(*)")
      .eq("id", dossierId)
      .single();

    if (dossierErr || !dossier) {
      return { success: false, error: `Dossier introuvable: ${dossierErr?.message ?? ""}` };
    }

    // Vérifier la validité du client avant de finaliser
    if (!dossier.client?.is_valid) {
      return { success: false, error: "Le client n'est plus valide. Veuillez vérifier sa pièce d'identité avant de valider le dossier." };
    }

    const { data: brouillonLots } = await supabase
      .from("lots")
      .select("*")
      .eq("dossier_id", dossierId)
      .eq("status", "brouillon");

    if (!brouillonLots || brouillonLots.length === 0) {
      return { success: false, error: "Aucun lot brouillon à finaliser" };
    }

    const now = new Date();
    const delai48h = new Date(now.getTime() + RETRACTATION_DELAY_MS);
    const emailTriggers: EmailTrigger[] = [];

    for (const lot of brouillonLots) {
      let result: InternalResult;

      if (lot.type === "rachat") {
        result = await processRachatLot(supabase, lot, dossier, now, delai48h);
      } else if (lot.type === "depot_vente") {
        result = await processDepotVenteLot(supabase, lot, dossier, now);
      } else if (lot.type === "vente") {
        result = await processVenteLot(supabase, lot, dossier, now);
      } else {
        continue;
      }

      if (!result.success) return result;
      if (result.emailTriggers) emailTriggers.push(...result.emailTriggers);
    }

    // Check if ALL lots are now finalized/terminated
    const { data: updatedLots } = await supabase
      .from("lots")
      .select("status")
      .eq("dossier_id", dossierId);

    const allDone = (updatedLots ?? []).every(
      (l: { status: string }) => l.status === "finalise"
    );

    const newStatus = allDone ? "finalise" : "en_cours";
    const { error: statusErr } = await supabase
      .from("dossiers")
      .update({ status: newStatus })
      .eq("id", dossierId);

    if (statusErr) {
      return { success: false, error: `Erreur mise à jour statut dossier: ${statusErr.message}` };
    }

    // Send emails server-side (fire-and-forget, don't block finalization)
    for (const trigger of emailTriggers) {
      sendNotification({
        notification_type: trigger.type,
        lot_id: trigger.lotId,
        dossier_id: trigger.dossierId,
        client_id: trigger.clientId,
        attachment_paths: trigger.paths,
      }).catch((err) => {
        console.error(`[FINALIZE-ACTION] Email send error (${trigger.type}):`, err);
      });
    }

    return { success: true };
  } catch (err) {
    console.error("[FINALIZE-ACTION] Unexpected error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Erreur inattendue" };
  }
}

/* ──────────────────────── HELPERS ──────────────────────── */

function buildClientInfo(dossier: { client: { civility: string; first_name: string; last_name: string; address: string | null; postal_code: string | null; city: string | null } }): ClientInfo {
  return {
    civilite: dossier.client.civility === "M" ? "M." : "Mme",
    nom: dossier.client.last_name,
    prenom: dossier.client.first_name,
    adresse: dossier.client.address ?? undefined,
    codePostal: dossier.client.postal_code ?? undefined,
    ville: dossier.client.city ?? undefined,
  };
}

function buildDossierInfo(dossier: { numero: string }, lot: { numero: string }, now: Date): DossierInfo {
  return {
    numeroDossier: dossier.numero,
    numeroLot: lot.numero,
    date: formatDate(now.toISOString()),
    heure: formatTime(now),
  };
}

function buildRefLignes(refList: Ref[]): ReferenceLigne[] {
  return refList.map((r: Ref) => ({
    designation: r.designation,
    metal: r.metal ?? "—",
    titrage: r.qualite ?? "—",
    poids: r.poids_net ?? r.poids ?? 0,
    quantite: r.quantite,
    taxe: r.montant_taxe > 0 ? (r.regime_fiscal === "TFOP" ? "6.5%" : r.regime_fiscal === "TPV" ? "TPV" : "11.5%") : "0%",
    prixUnitaire: r.prix_achat,
    prixTotal: r.prix_achat * r.quantite,
  }));
}

function getTaxeLabel(refList: Ref[]): string {
  const regime = refList.find((r: Ref) => r.regime_fiscal)?.regime_fiscal;
  if (regime === "TFOP") return "Taxe (TFOP+CRDS)";
  if (regime === "TPV") return "Taxe (Plus-Value)";
  return "Taxe (TMP+CRDS)";
}

function buildTotaux(refList: Ref[]): TotauxInfo {
  const brut = refList.reduce((s: number, r: Ref) => s + r.prix_achat * r.quantite, 0);
  const taxe = refList.reduce((s: number, r: Ref) => s + r.montant_taxe * r.quantite, 0);
  return { totalBrut: brut, taxe, netAPayer: brut - taxe, taxeLabel: getTaxeLabel(refList) };
}

async function genDoc(params: Parameters<typeof generateAndStoreDocument>[0], label: string): Promise<{ path: string | null; error?: string }> {
  const result = await generateAndStoreDocument(params, true);
  if (result.error) {
    return { path: null, error: `${label}: ${result.error}` };
  }
  return { path: result.path };
}

/* ──────────────────────── RACHAT ──────────────────────── */

async function processRachatLot(supabase: SB, lot: Ref, dossier: Ref, now: Date, delai48h: Date): Promise<InternalResult> {
  const { data: refs } = await supabase.from("lot_references").select("*").eq("lot_id", lot.id);

  let allImmediate = true;
  const emailTriggers: EmailTrigger[] = [];

  for (const ref of refs ?? []) {
    if (ref.type_rachat === "devis") {
      const { error } = await supabase
        .from("lot_references")
        .update({ status: "devis_envoye", date_envoi: now.toISOString(), date_fin_delai: delai48h.toISOString() })
        .eq("id", ref.id);
      if (error) return { success: false, error: `Erreur mise à jour réf devis: ${error.message}` };
      allImmediate = false;
    } else if (ref.categorie === "bijoux" && ref.type_rachat === "direct") {
      const { error } = await supabase
        .from("lot_references")
        .update({ status: "en_retractation", date_envoi: now.toISOString(), date_fin_delai: delai48h.toISOString() })
        .eq("id", ref.id);
      if (error) return { success: false, error: `Erreur mise à jour réf rétractation: ${error.message}` };
      allImmediate = false;
    } else if (ref.categorie === "or_investissement" && ref.type_rachat === "direct") {
      // Stock NOT incremented here — only after payment of the quittance
      const { error } = await supabase.from("lot_references").update({ status: "en_attente_paiement" }).eq("id", ref.id);
      if (error) return { success: false, error: `Erreur mise en attente paiement réf: ${error.message}` };
      allImmediate = false;
    }
  }

  // Generate documents
  const allRefs = refs ?? [];
  const clientInfo = buildClientInfo(dossier);

  const { data: idDoc } = await supabase
    .from("client_identity_documents")
    .select("document_type, document_number")
    .eq("client_id", dossier.client.id)
    .eq("is_primary", true)
    .single();
  if (idDoc) {
    clientInfo.documentType = idDoc.document_type;
    clientInfo.documentNumber = idDoc.document_number;
  }

  const dossierInfo = buildDossierInfo(dossier, lot, now);
  const bijouxDirect = allRefs.filter((r: Ref) => r.categorie === "bijoux" && r.type_rachat === "direct");
  const orInvestDirect = allRefs.filter((r: Ref) => r.categorie === "or_investissement" && r.type_rachat === "direct");
  const devisRefs = allRefs.filter((r: Ref) => r.type_rachat === "devis");
  const docErrors: string[] = [];

  const rachatPaths: string[] = [];

  if (bijouxDirect.length > 0) {
    const res = await genDoc({
      type: "contrat_rachat", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
      client: clientInfo, dossier: dossierInfo, references: buildRefLignes(bijouxDirect), totaux: buildTotaux(bijouxDirect),
      lotReferenceIds: bijouxDirect.map((r: Ref) => r.id),
    }, "contrat_rachat");
    if (res.error) docErrors.push(res.error);
    else if (res.path) rachatPaths.push(res.path);
  }

  if (orInvestDirect.length > 0) {
    const res = await genDoc({
      type: "quittance_rachat", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
      client: clientInfo, dossier: dossierInfo, references: buildRefLignes(orInvestDirect), totaux: buildTotaux(orInvestDirect),
      lotReferenceIds: orInvestDirect.map((r: Ref) => r.id),
    }, "quittance_rachat");
    if (res.error) docErrors.push(res.error);
    else if (res.path) rachatPaths.push(res.path);
  }

  if (rachatPaths.length > 0) {
    emailTriggers.push({ type: "contrat_rachat_finalise", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id, paths: rachatPaths });
  }

  if (devisRefs.length > 0) {
    const res = await genDoc({
      type: "devis_rachat", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
      client: clientInfo, dossier: dossierInfo, references: buildRefLignes(devisRefs), totaux: buildTotaux(devisRefs),
      lotReferenceIds: devisRefs.map((r: Ref) => r.id),
    }, "devis_rachat");
    if (res.error) docErrors.push(res.error);
    else if (res.path) {
      emailTriggers.push({ type: "devis_envoye", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id, paths: [res.path] });
    }
  }

  if (docErrors.length > 0) {
    return { success: false, error: `Echec génération: ${docErrors.join(", ")}` };
  }

  // Update lot status
  const newStatus = allImmediate ? "finalise" : "en_cours";
  const updateData = allImmediate
    ? { status: newStatus, outcome: "complete", date_finalisation: now.toISOString() }
    : { status: newStatus };
  const { error: lotErr } = await supabase.from("lots").update(updateData).eq("id", lot.id);
  if (lotErr) return { success: false, error: `Erreur passage lot rachat: ${lotErr.message}` };

  return { success: true, emailTriggers };
}

/* ──────────────────────── DEPOT-VENTE ──────────────────────── */

async function processDepotVenteLot(supabase: SB, lot: Ref, dossier: Ref, now: Date): Promise<InternalResult> {
  const { data: refs } = await supabase.from("lot_references").select("*").eq("lot_id", lot.id);
  const emailTriggers: EmailTrigger[] = [];

  // Les références restent en expertise jusqu'à la signature du contrat
  // C'est l'action doc.signer_contrat_dpv qui créera les entrées stock

  // Generate documents
  const allDvRefs = refs ?? [];
  const clientInfo = buildClientInfo(dossier);

  const { data: idDoc } = await supabase
    .from("client_identity_documents")
    .select("document_type, document_number")
    .eq("client_id", dossier.client.id)
    .eq("is_primary", true)
    .single();
  if (idDoc) {
    clientInfo.documentType = idDoc.document_type;
    clientInfo.documentNumber = idDoc.document_number;
  }

  const dossierInfo = buildDossierInfo(dossier, lot, now);
  const dvRefs: DepotVenteReferenceLigne[] = allDvRefs.map((r: Ref) => ({
    designation: r.designation,
    description: [r.metal, r.qualite].filter(Boolean).join(" ") || "—",
    prixNetDeposant: r.prix_achat,
    prixAffichePublic: r.prix_revente_estime ?? 0,
  }));

  const docErrors: string[] = [];

  const contratRes = await genDoc({
    type: "contrat_depot_vente", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
    client: clientInfo, dossier: dossierInfo, depotVenteReferences: dvRefs, numeroLot: lot.numero,
    references: [], totaux: { totalBrut: 0, taxe: 0, netAPayer: 0 },
    lotReferenceIds: allDvRefs.map((r: Ref) => r.id),
  }, "contrat_depot_vente");
  if (contratRes.error) docErrors.push(contratRes.error);
  else if (contratRes.path) {
    emailTriggers.push({ type: "contrat_depot_vente", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id, paths: [contratRes.path] });
  }

  for (const ref of allDvRefs) {
    const confieRef: ConfieReferenceLigne = {
      titre: ref.qualite ?? "—",
      designation: `${ref.designation} (${ref.metal ?? "—"})`,
      quantite: ref.quantite,
      poids: ref.poids_net ?? ref.poids ?? 0,
      prixAchat: ref.prix_achat,
      prixVente: ref.prix_revente_estime ?? 0,
    };
    const res = await genDoc({
      type: "confie_achat", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
      client: clientInfo, dossier: dossierInfo, confieReference: confieRef,
      references: [], totaux: { totalBrut: ref.prix_revente_estime ?? 0, taxe: 0, netAPayer: ref.prix_revente_estime ?? 0 },
      lotReferenceIds: [ref.id],
    }, "confie_achat");
    if (res.error) docErrors.push(res.error);
  }

  if (docErrors.length > 0) {
    return { success: false, error: `Echec génération: ${docErrors.join(", ")}` };
  }

  // Le lot dépôt-vente reste en_cours tant que toutes les refs ne sont pas terminées (vendues ou rendues)
  const { error: lotErr } = await supabase.from("lots").update({ status: "en_cours" }).eq("id", lot.id);
  if (lotErr) return { success: false, error: `Erreur passage lot DV en cours: ${lotErr.message}` };

  return { success: true, emailTriggers };
}

/* ──────────────────────── VENTE ──────────────────────── */

async function processVenteLot(supabase: SB, lot: Ref, dossier: Ref, now: Date): Promise<InternalResult> {
  const { data: lignes, error: lignesErr } = await supabase
    .from("vente_lignes")
    .select("*")
    .eq("lot_id", lot.id)
    .order("created_at", { ascending: true });

  if (lignesErr) return { success: false, error: `Erreur récup lignes vente: ${lignesErr.message}` };
  if (!lignes || lignes.length === 0) return { success: false, error: `Aucune ligne de vente pour lot ${lot.numero}` };

  const bijouxLignes = lignes.filter((l: VenteLigne) => !l.or_investissement_id);
  const orInvestLignes = lignes.filter((l: VenteLigne) => !!l.or_investissement_id);

  const clientInfo = buildClientInfo(dossier);
  const { data: idDoc } = await supabase
    .from("client_identity_documents")
    .select("document_type, document_number")
    .eq("client_id", dossier.client.id)
    .eq("is_primary", true)
    .single();
  if (idDoc) {
    clientInfo.documentType = idDoc.document_type;
    clientInfo.documentNumber = idDoc.document_number;
  }

  const dossierInfo = buildDossierInfo(dossier, lot, now);
  const emailTriggers: EmailTrigger[] = [];
  const docErrors: string[] = [];

  function buildFactureLignes(lines: VenteLigne[]): FactureVenteLigne[] {
    return lines.map((l: VenteLigne) => ({
      titre: [l.metal, l.qualite].filter(Boolean).join(" ") || l.designation || "Article",
      designation: l.designation ?? "",
      poids: l.poids_net ?? l.poids ?? 0,
      quantite: l.quantite ?? 1,
      prixUnitaireHT: l.prix_unitaire ?? 0,
      totalHT: l.prix_total ?? 0,
    }));
  }

  // Phase 1: Generate quittances DPV for depot-vente items (BEFORE factures)
  const dvItemsByLot = new Map<string, Array<{ stockId: string; prixVente: number; designation: string }>>();
  for (const ligne of bijouxLignes) {
    if (!ligne.bijoux_stock_id) continue;
    const { data: stockItem } = await supabase
      .from("bijoux_stock")
      .select("depot_vente_lot_id")
      .eq("id", ligne.bijoux_stock_id)
      .single();
    if (stockItem?.depot_vente_lot_id) {
      const existing = dvItemsByLot.get(stockItem.depot_vente_lot_id) ?? [];
      existing.push({ stockId: ligne.bijoux_stock_id, prixVente: ligne.prix_total, designation: ligne.designation });
      dvItemsByLot.set(stockItem.depot_vente_lot_id, existing);
    }
  }

  for (const [dvLotId, items] of dvItemsByLot.entries()) {
    // Use the server action to generate the quittance
    const { data: dvLot } = await supabase
      .from("lots")
      .select("id, numero, dossier_id, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name, address, postal_code, city))")
      .eq("id", dvLotId)
      .single();

    if (!dvLot?.dossier) continue;

    const dvDossier = dvLot.dossier as Ref;
    const deposant = dvDossier.client;

    const { data: dvIdDoc } = await supabase
      .from("client_identity_documents")
      .select("document_type, document_number")
      .eq("client_id", deposant.id)
      .eq("is_primary", true)
      .single();

    const stockIds = items.map((i) => i.stockId);
    const { data: lotRefs } = await supabase
      .from("lot_references")
      .select("id, destination_stock_id, prix_achat, designation")
      .in("destination_stock_id", stockIds);

    // Idempotence: check if a quittance DPV already exists for these refs
    const refIds = (lotRefs ?? []).map((r: Ref) => r.id);
    if (refIds.length > 0) {
      const { data: existingDocRefs } = await supabase
        .from("document_references")
        .select("document_id")
        .in("lot_reference_id", refIds);
      const linkedDocIds = [...new Set((existingDocRefs ?? []).map((dr: { document_id: string }) => dr.document_id))];
      if (linkedDocIds.length > 0) {
        const { data: existingQdv } = await supabase
          .from("documents")
          .select("type")
          .in("id", linkedDocIds)
          .eq("type", "quittance_depot_vente")
          .limit(1);
        if (existingQdv && existingQdv.length > 0) continue;
      }
    }

    const refByStockId = new Map((lotRefs ?? []).map((r: Ref) => [r.destination_stock_id, r]));

    const qdvLignes: QuittanceDepotVenteLigne[] = [];
    let totalVentes = 0;
    let totalCommission = 0;
    let totalNetDeposant = 0;

    for (const item of items) {
      const ref = refByStockId.get(item.stockId);
      const prixVente = item.prixVente;
      const netDeposant = ref?.prix_achat ?? prixVente * 0.6;
      const commission = prixVente - netDeposant;
      qdvLignes.push({ designation: ref?.designation ?? item.designation, description: item.designation, prixVentePublic: prixVente, netDeposant, commission });
      totalVentes += prixVente;
      totalCommission += commission;
      totalNetDeposant += netDeposant;
    }

    const dvClientInfo: ClientInfo = {
      civilite: deposant.civility === "M" ? "M." : "Mme",
      nom: deposant.last_name, prenom: deposant.first_name,
      adresse: deposant.address ?? undefined, codePostal: deposant.postal_code ?? undefined, ville: deposant.city ?? undefined,
      documentType: dvIdDoc?.document_type ?? undefined, documentNumber: dvIdDoc?.document_number ?? undefined,
    };

    const qdvRes = await genDoc({
      type: "quittance_depot_vente", lotId: dvLot.id, dossierId: dvDossier.id, clientId: deposant.id,
      client: dvClientInfo,
      dossier: { numeroDossier: dvDossier.numero, numeroLot: dvLot.numero, date: formatDate(now.toISOString()), heure: formatTime(now) },
      references: [], totaux: { totalBrut: totalVentes, taxe: totalCommission, netAPayer: totalNetDeposant },
      quittanceDepotVenteLignes: qdvLignes, totalVentes, totalCommission, venteDossierNumero: dossier.numero,
      lotReferenceIds: (lotRefs ?? []).map((r: Ref) => r.id),
    }, "quittance_depot_vente");
    if (qdvRes.error) docErrors.push(qdvRes.error);

    // Mark DPV bijoux as vendu and update lot_references
    for (const item of items) {
      await supabase.from("bijoux_stock").update({ statut: "vendu" }).eq("id", item.stockId);
      await supabase.from("lot_references").update({ status: "vendu" }).eq("destination_stock_id", item.stockId);
    }
  }

  // Phase 2: Facture de vente (bijoux)
  if (bijouxLignes.length > 0) {
    const totalHT = bijouxLignes.reduce((s: number, l: VenteLigne) => s + l.prix_total, 0);
    const tva = bijouxLignes.reduce((s: number, l: VenteLigne) => s + l.montant_taxe, 0);
    const totalTTC = totalHT + tva;

    const res = await genDoc({
      type: "facture_vente", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
      client: clientInfo, dossier: dossierInfo, references: [],
      totaux: { totalBrut: totalHT, taxe: tva, netAPayer: totalTTC },
      factureVenteLignes: buildFactureLignes(bijouxLignes),
      totalHT, tva, totalTTC, modeReglement: "—",
    }, "facture_vente");
    if (res.error) docErrors.push(res.error);
    else if (res.path) {
      emailTriggers.push({ type: "facture_vente", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id, paths: [res.path] });
    }
  }

  // Factures or investissement (acompte + solde)
  if (orInvestLignes.length > 0) {
    const rules = await getSettingServer("business_rules");
    const acomptePct = rules?.acompte_pct ?? 10;

    const totalHT = orInvestLignes.reduce((s: number, l: VenteLigne) => s + l.prix_total, 0);
    const tva = orInvestLignes.reduce((s: number, l: VenteLigne) => s + l.montant_taxe, 0);
    const totalTTC = totalHT + tva;
    const montantAcompte = Math.round(totalTTC * (acomptePct / 100) * 100) / 100;
    const montantSolde = totalTTC - montantAcompte;
    const dateLimite = new Date(now.getTime() + RETRACTATION_DELAY_MS);

    const acompteRes = await genDoc({
      type: "facture_acompte", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
      client: clientInfo, dossier: dossierInfo, references: [],
      totaux: { totalBrut: totalHT, taxe: tva, netAPayer: totalTTC },
      factureVenteLignes: buildFactureLignes(orInvestLignes),
      totalHT, tva, totalTTC, acomptePourcentage: acomptePct, montantAcompte, montantSolde,
      dateLimiteSolde: formatDateTime(dateLimite.toISOString()),
    }, "facture_acompte");
    if (acompteRes.error) docErrors.push(acompteRes.error);
    else if (acompteRes.path) {
      emailTriggers.push({ type: "facture_acompte", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id, paths: [acompteRes.path] });
    }

    // Get acompte numero for solde reference
    const { data: acompteDoc } = await supabase
      .from("documents")
      .select("numero")
      .eq("lot_id", lot.id)
      .eq("type", "facture_acompte")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const numeroAcompte = acompteDoc?.numero ?? "";

    const soldeRes = await genDoc({
      type: "facture_solde", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
      client: clientInfo, dossier: dossierInfo, references: [],
      totaux: { totalBrut: totalHT, taxe: tva, netAPayer: montantSolde },
      factureVenteLignes: buildFactureLignes(orInvestLignes),
      totalHT, tva, totalTTC, montantAcompte, montantSolde, numeroAcompte,
      modeReglement: "—", referenceNumero: numeroAcompte,
    }, "facture_solde");
    if (soldeRes.error) docErrors.push(soldeRes.error);
    else if (soldeRes.path) {
      emailTriggers.push({ type: "facture_vente", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id, paths: [soldeRes.path] });
    }

    await supabase.from("lots").update({ acompte_montant: montantAcompte, date_limite_solde: dateLimite.toISOString() }).eq("id", lot.id);
  }

  if (docErrors.length > 0) {
    return { success: false, error: `Echec génération: ${docErrors.join(", ")}` };
  }

  // Bijoux stock: réserver + marquer comme livrés immédiatement
  for (const ligne of bijouxLignes) {
    if (ligne.bijoux_stock_id) {
      await supabase
        .from("bijoux_stock")
        .update({ statut: "reserve" })
        .eq("id", ligne.bijoux_stock_id);
    }
    await supabase
      .from("vente_lignes")
      .update({ is_livre: true })
      .eq("id", ligne.id);
  }

  // Toutes les lignes or investissement en attente de dispatch manuel
  for (const ligne of orInvestLignes) {
    if (!ligne.or_investissement_id) continue;
    await supabase
      .from("vente_lignes")
      .update({ fulfillment: "a_commander" })
      .eq("id", ligne.id);
  }

  const { error: lotErr } = await supabase.from("lots").update({ status: "en_cours" }).eq("id", lot.id);
  if (lotErr) return { success: false, error: `Erreur passage lot vente en cours: ${lotErr.message}` };

  return { success: true, emailTriggers };
}
