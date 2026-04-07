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
} from "@/lib/pdf";

const RETRACTATION_DELAY_MS = 48 * 60 * 60 * 1000;

import type { EmailNotificationType } from "@/types/email";

export interface FinaliseResult {
  success: boolean;
  error?: string;
  emailTriggers?: EmailTrigger[];
}

export interface EmailTrigger {
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
      let result: FinaliseResult;

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
      (l: { status: string }) => l.status === "finalise" || l.status === "termine"
    );

    const newStatus = allDone ? "finalise" : "en_cours";
    const { error: statusErr } = await supabase
      .from("dossiers")
      .update({ status: newStatus })
      .eq("id", dossierId);

    if (statusErr) {
      return { success: false, error: `Erreur mise à jour statut dossier: ${statusErr.message}` };
    }

    return { success: true, emailTriggers };
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
    poids: r.poids ?? 0,
    quantite: r.quantite,
    taxe: r.montant_taxe > 0 ? "11.5%" : "0%",
    prixUnitaire: r.prix_achat,
    prixTotal: r.prix_achat * r.quantite,
  }));
}

function buildTotaux(refList: Ref[]): TotauxInfo {
  const brut = refList.reduce((s: number, r: Ref) => s + r.prix_achat * r.quantite, 0);
  const taxe = refList.reduce((s: number, r: Ref) => s + r.montant_taxe * r.quantite, 0);
  return { totalBrut: brut, taxe, netAPayer: brut - taxe };
}

async function genDoc(params: Parameters<typeof generateAndStoreDocument>[0], label: string): Promise<{ path: string | null; error?: string }> {
  const result = await generateAndStoreDocument(params, true);
  if (result.error) {
    return { path: null, error: `${label}: ${result.error}` };
  }
  return { path: result.path };
}

/* ──────────────────────── RACHAT ──────────────────────── */

async function processRachatLot(supabase: SB, lot: Ref, dossier: Ref, now: Date, delai48h: Date): Promise<FinaliseResult> {
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
      const { error: rpcErr } = await supabase.rpc("increment_or_invest_quantite", { p_id: ref.or_investissement_id, p_qty: ref.quantite });
      if (rpcErr) return { success: false, error: `Erreur incrément stock or: ${rpcErr.message}` };
      const { error } = await supabase.from("lot_references").update({ status: "finalise" }).eq("id", ref.id);
      if (error) return { success: false, error: `Erreur finalisation réf: ${error.message}` };
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

  if (bijouxDirect.length > 0) {
    const res = await genDoc({
      type: "contrat_rachat", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
      client: clientInfo, dossier: dossierInfo, references: buildRefLignes(bijouxDirect), totaux: buildTotaux(bijouxDirect),
      lotReferenceIds: bijouxDirect.map((r: Ref) => r.id),
    }, "contrat_rachat");
    if (res.error) docErrors.push(res.error);
  }

  if (orInvestDirect.length > 0) {
    const res = await genDoc({
      type: "quittance_rachat", lotId: lot.id, dossierId: dossier.id, clientId: dossier.client.id,
      client: clientInfo, dossier: dossierInfo, references: buildRefLignes(orInvestDirect), totaux: buildTotaux(orInvestDirect),
      lotReferenceIds: orInvestDirect.map((r: Ref) => r.id),
    }, "quittance_rachat");
    if (res.error) docErrors.push(res.error);
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
    ? { status: newStatus, date_finalisation: now.toISOString() }
    : { status: newStatus };
  const { error: lotErr } = await supabase.from("lots").update(updateData).eq("id", lot.id);
  if (lotErr) return { success: false, error: `Erreur passage lot rachat: ${lotErr.message}` };

  return { success: true, emailTriggers };
}

/* ──────────────────────── DEPOT-VENTE ──────────────────────── */

async function processDepotVenteLot(supabase: SB, lot: Ref, dossier: Ref, now: Date): Promise<FinaliseResult> {
  const { data: refs } = await supabase.from("lot_references").select("*").eq("lot_id", lot.id);
  const emailTriggers: EmailTrigger[] = [];

  for (const ref of refs ?? []) {
    if (ref.categorie === "bijoux") {
      const { data: stockEntry, error: stockErr } = await supabase
        .from("bijoux_stock")
        .insert({
          nom: ref.designation, metaux: ref.metal, qualite: ref.qualite, poids: ref.poids,
          prix_achat: ref.prix_achat, prix_revente: ref.prix_revente_estime, quantite: ref.quantite,
          statut: "en_depot_vente", depot_vente_lot_id: lot.id, deposant_client_id: dossier.client.id,
        })
        .select("id")
        .single();
      if (stockErr) return { success: false, error: `Erreur création stock DV: ${stockErr.message}` };
      if (stockEntry) {
        const { error } = await supabase.from("lot_references").update({ status: "en_depot_vente", destination_stock_id: stockEntry.id }).eq("id", ref.id);
        if (error) return { success: false, error: `Erreur mise à jour réf DV: ${error.message}` };
      }
    }
  }

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
      poids: ref.poids ?? 0,
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

  const { error: lotErr } = await supabase.from("lots").update({ status: "finalise", date_finalisation: now.toISOString() }).eq("id", lot.id);
  if (lotErr) return { success: false, error: `Erreur finalisation lot DV: ${lotErr.message}` };

  return { success: true, emailTriggers };
}

/* ──────────────────────── VENTE ──────────────────────── */

async function processVenteLot(supabase: SB, lot: Ref, dossier: Ref, now: Date): Promise<FinaliseResult> {
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
      poids: l.poids ?? 0,
      quantite: l.quantite ?? 1,
      prixUnitaireHT: l.prix_unitaire ?? 0,
      totalHT: l.prix_total ?? 0,
    }));
  }

  // Facture de vente (bijoux)
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

  const { error: lotErr } = await supabase.from("lots").update({ status: "en_cours" }).eq("id", lot.id);
  if (lotErr) return { success: false, error: `Erreur passage lot vente en cours: ${lotErr.message}` };

  return { success: true, emailTriggers };
}
