import { mutate } from "@/lib/supabase/mutation";
import { generateDocument } from "@/lib/pdf/pdf-actions";
import { triggerEmail } from "@/lib/email/trigger";
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
import type { DossierWithClient } from "@/types/dossier";
import type { Lot } from "@/types/lot";
import type { VenteLigne } from "@/types/vente";

export const RETRACTATION_DELAY_MS = 48 * 60 * 60 * 1000; // 48 hours

type SupabaseClient = ReturnType<typeof import("@/lib/supabase/client").createClient>;

export interface FinaliserDossierParams {
  dossier: DossierWithClient;
  brouillonLots: Lot[];
  supabase: SupabaseClient;
}

export interface FinaliserDossierResult {
  success: boolean;
}

function buildClientInfo(dossier: DossierWithClient): ClientInfo {
  return {
    civilite: dossier.client.civility === "M" ? "M." : "Mme",
    nom: dossier.client.last_name,
    prenom: dossier.client.first_name,
    adresse: dossier.client.address ?? undefined,
    codePostal: dossier.client.postal_code ?? undefined,
    ville: dossier.client.city ?? undefined,
  };
}

export async function finaliserDossier({
  dossier,
  brouillonLots,
  supabase,
}: FinaliserDossierParams): Promise<FinaliserDossierResult> {
  const now = new Date();
  const delai48h = new Date(now.getTime() + RETRACTATION_DELAY_MS);

  for (const lot of brouillonLots) {
    if (lot.type === "rachat") {
      const result = await processRachatLot({ lot, dossier, supabase, now, delai48h });
      if (!result.success) return { success: false };
      continue;
    }

    if (lot.type === "depot_vente") {
      const result = await processDepotVenteLot({ lot, dossier, supabase, now });
      if (!result.success) return { success: false };
      continue;
    }

    if (lot.type === "vente") {
      const result = await processVenteLot({ lot, dossier, supabase, now });
      if (!result.success) return { success: false };
      continue;
    }
  }

  // Check if ALL lots are now finalized/terminated to update dossier
  const { data: updatedLots } = await supabase
    .from("lots")
    .select("status")
    .eq("dossier_id", dossier.id);

  const allDone = (updatedLots ?? []).every(
    (l: { status: string }) => l.status === "finalise" || l.status === "termine"
  );

  const { error: dossierError } = await mutate(
    supabase
      .from("dossiers")
      .update({ status: allDone ? "finalise" : "en_cours" })
      .eq("id", dossier.id),
    "Erreur lors de la mise à jour du statut du dossier",
    "Dossier finalisé"
  );
  if (dossierError) return { success: false };

  return { success: true };
}

// --- Rachat lot processing ---

async function processRachatLot({
  lot,
  dossier,
  supabase,
  now,
  delai48h,
}: {
  lot: Lot;
  dossier: DossierWithClient;
  supabase: SupabaseClient;
  now: Date;
  delai48h: Date;
}): Promise<FinaliserDossierResult> {
  const { data: refs } = await supabase
    .from("lot_references")
    .select("*")
    .eq("lot_id", lot.id);

  let allImmediate = true;

  for (const ref of refs ?? []) {
    if (ref.type_rachat === "devis") {
      const { error } = await mutate(
        supabase
          .from("lot_references")
          .update({
            status: "devis_envoye",
            date_envoi: now.toISOString(),
            date_fin_delai: delai48h.toISOString(),
          })
          .eq("id", ref.id),
        "Erreur lors de la mise à jour de la référence en devis"
      );
      if (error) return { success: false };
      allImmediate = false;
    } else if (ref.categorie === "bijoux" && ref.type_rachat === "direct") {
      const { error } = await mutate(
        supabase
          .from("lot_references")
          .update({
            status: "en_retractation",
            date_envoi: now.toISOString(),
            date_fin_delai: delai48h.toISOString(),
          })
          .eq("id", ref.id),
        "Erreur lors de la mise à jour de la référence en rétractation"
      );
      if (error) return { success: false };
      allImmediate = false;
    } else if (ref.categorie === "or_investissement" && ref.type_rachat === "direct") {
      const { error: rpcError } = await mutate(
        supabase.rpc("increment_or_invest_quantite", {
          p_id: ref.or_investissement_id,
          p_qty: ref.quantite,
        }),
        "Erreur lors de l'incrémentation du stock or investissement"
      );
      if (rpcError) return { success: false };
      const { error } = await mutate(
        supabase
          .from("lot_references")
          .update({ status: "finalise" })
          .eq("id", ref.id),
        "Erreur lors de la finalisation de la référence"
      );
      if (error) return { success: false };
    }
  }

  // Generate documents for this rachat lot
  const allRefs = refs ?? [];
  const clientInfo = buildClientInfo(dossier);
  const dossierInfo: DossierInfo = {
    numeroDossier: dossier.numero,
    numeroLot: lot.numero,
    date: formatDate(now.toISOString()),
    heure: formatTime(now),
  };

  const bijouxDirect = allRefs.filter((r: { categorie: string; type_rachat: string }) => r.categorie === "bijoux" && r.type_rachat === "direct");
  const orInvestDirect = allRefs.filter((r: { categorie: string; type_rachat: string }) => r.categorie === "or_investissement" && r.type_rachat === "direct");
  const devisRefs = allRefs.filter((r: { type_rachat: string }) => r.type_rachat === "devis");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildRefLignes = (refList: any[]): ReferenceLigne[] =>
    refList.map((r) => ({
      designation: r.designation,
      metal: r.metal ?? "—",
      titrage: r.qualite ?? "—",
      poids: r.poids ?? 0,
      quantite: r.quantite,
      taxe: r.montant_taxe > 0 ? "11.5%" : "0%",
      prixUnitaire: r.prix_achat,
      prixTotal: r.prix_achat * r.quantite,
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildTotaux = (refList: any[]): TotauxInfo => {
    const brut = refList.reduce((s: number, r: { prix_achat: number; quantite: number }) => s + r.prix_achat * r.quantite, 0);
    const taxe = refList.reduce((s: number, r: { montant_taxe: number; quantite: number }) => s + r.montant_taxe * r.quantite, 0);
    return { totalBrut: brut, taxe, netAPayer: brut - taxe };
  };

  if (bijouxDirect.length > 0) {
    await generateDocument({
      type: "contrat_rachat",
      lotId: lot.id,
      dossierId: dossier.id,
      clientId: dossier.client.id,
      client: clientInfo,
      dossier: dossierInfo,
      references: buildRefLignes(bijouxDirect),
      totaux: buildTotaux(bijouxDirect),
    });
  }

  if (orInvestDirect.length > 0) {
    await generateDocument({
      type: "quittance_rachat",
      lotId: lot.id,
      dossierId: dossier.id,
      clientId: dossier.client.id,
      client: clientInfo,
      dossier: dossierInfo,
      references: buildRefLignes(orInvestDirect),
      totaux: buildTotaux(orInvestDirect),
    });
  }

  if (devisRefs.length > 0) {
    const devisPath = await generateDocument({
      type: "devis_rachat",
      lotId: lot.id,
      dossierId: dossier.id,
      clientId: dossier.client.id,
      client: clientInfo,
      dossier: dossierInfo,
      references: buildRefLignes(devisRefs),
      totaux: buildTotaux(devisRefs),
    });
    if (devisPath) {
      triggerEmail({
        notification_type: "devis_envoye",
        lot_id: lot.id,
        dossier_id: dossier.id,
        client_id: dossier.client.id,
        attachment_paths: [devisPath],
      });
    }
  }

  if (allImmediate) {
    const { error } = await mutate(
      supabase
        .from("lots")
        .update({ status: "finalise", date_finalisation: now.toISOString() })
        .eq("id", lot.id),
      "Erreur lors de la finalisation du lot"
    );
    if (error) return { success: false };
  } else {
    const { error } = await mutate(
      supabase
        .from("lots")
        .update({ status: "en_cours" })
        .eq("id", lot.id),
      "Erreur lors du passage du lot en cours"
    );
    if (error) return { success: false };
  }

  return { success: true };
}

// --- Depot-vente lot processing ---

async function processDepotVenteLot({
  lot,
  dossier,
  supabase,
  now,
}: {
  lot: Lot;
  dossier: DossierWithClient;
  supabase: SupabaseClient;
  now: Date;
}): Promise<FinaliserDossierResult> {
  const { data: refs } = await supabase
    .from("lot_references")
    .select("*")
    .eq("lot_id", lot.id);

  for (const ref of refs ?? []) {
    if (ref.categorie === "bijoux") {
      const { data: stockEntry, error: stockError } = await mutate(
        supabase
          .from("bijoux_stock")
          .insert({
            nom: ref.designation,
            metaux: ref.metal,
            qualite: ref.qualite,
            poids: ref.poids,
            prix_achat: ref.prix_achat,
            prix_revente: ref.prix_revente_estime,
            quantite: ref.quantite,
            statut: "en_depot_vente",
            depot_vente_lot_id: lot.id,
            deposant_client_id: dossier.client.id,
          })
          .select("id")
          .single(),
        "Erreur lors de la création de l'entrée stock dépôt-vente"
      );
      if (stockError) return { success: false };

      if (stockEntry) {
        const { error } = await mutate(
          supabase
            .from("lot_references")
            .update({ status: "en_depot_vente", destination_stock_id: stockEntry.id })
            .eq("id", ref.id),
          "Erreur lors de la mise à jour de la référence en dépôt-vente"
        );
        if (error) return { success: false };
      }
    }
  }

  // Generate depot-vente documents
  const allDvRefs = refs ?? [];
  const dvClientInfo = buildClientInfo(dossier);

  const { data: idDoc } = await supabase
    .from("client_identity_documents")
    .select("document_type, document_number")
    .eq("client_id", dossier.client.id)
    .eq("is_primary", true)
    .single();

  if (idDoc) {
    dvClientInfo.documentType = idDoc.document_type;
    dvClientInfo.documentNumber = idDoc.document_number;
  }

  const dvDossierInfo: DossierInfo = {
    numeroDossier: dossier.numero,
    numeroLot: lot.numero,
    date: formatDate(now.toISOString()),
    heure: formatTime(now),
  };

  const dvRefs: DepotVenteReferenceLigne[] = allDvRefs.map((r: { designation: string; metal: string | null; qualite: string | null; prix_achat: number; prix_revente_estime: number | null }) => ({
    designation: r.designation,
    description: [r.metal, r.qualite].filter(Boolean).join(" ") || "—",
    prixNetDeposant: r.prix_achat,
    prixAffichePublic: r.prix_revente_estime ?? 0,
  }));

  const dvContratPath = await generateDocument({
    type: "contrat_depot_vente",
    lotId: lot.id,
    dossierId: dossier.id,
    clientId: dossier.client.id,
    client: dvClientInfo,
    dossier: dvDossierInfo,
    depotVenteReferences: dvRefs,
    numeroLot: lot.numero,
    references: [],
    totaux: { totalBrut: 0, taxe: 0, netAPayer: 0 },
  });
  if (dvContratPath) {
    triggerEmail({
      notification_type: "contrat_depot_vente",
      lot_id: lot.id,
      dossier_id: dossier.id,
      client_id: dossier.client.id,
      attachment_paths: [dvContratPath],
    });
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

    await generateDocument({
      type: "confie_achat",
      lotId: lot.id,
      dossierId: dossier.id,
      clientId: dossier.client.id,
      client: dvClientInfo,
      dossier: dvDossierInfo,
      confieReference: confieRef,
      references: [],
      totaux: {
        totalBrut: ref.prix_revente_estime ?? 0,
        taxe: 0,
        netAPayer: ref.prix_revente_estime ?? 0,
      },
    });
  }

  {
    const { error } = await mutate(
      supabase
        .from("lots")
        .update({ status: "finalise", date_finalisation: now.toISOString() })
        .eq("id", lot.id),
      "Erreur lors de la finalisation du lot dépôt-vente"
    );
    if (error) return { success: false };
  }

  return { success: true };
}

// --- Vente lot processing ---

async function processVenteLot({
  lot,
  dossier,
  supabase,
  now,
}: {
  lot: Lot;
  dossier: DossierWithClient;
  supabase: SupabaseClient;
  now: Date;
}): Promise<FinaliserDossierResult> {
  const { data: lignes } = await supabase
    .from("vente_lignes")
    .select("*")
    .eq("lot_id", lot.id);

  const allLignes = lignes ?? [];
  const bijouxLignes = allLignes.filter((l: VenteLigne) => !!l.bijoux_stock_id);
  const orInvestLignes = allLignes.filter((l: VenteLigne) => !!l.or_investissement_id);

  const venteClientInfo = buildClientInfo(dossier);
  const { data: venteIdDoc } = await supabase
    .from("client_identity_documents")
    .select("document_type, document_number")
    .eq("client_id", dossier.client.id)
    .eq("is_primary", true)
    .single();
  if (venteIdDoc) {
    venteClientInfo.documentType = venteIdDoc.document_type;
    venteClientInfo.documentNumber = venteIdDoc.document_number;
  }

  const dateStr = formatDate(now.toISOString());
  const heureStr = formatTime(now);
  const venteDossierInfo: DossierInfo = {
    numeroDossier: dossier.numero,
    numeroLot: lot.numero,
    date: dateStr,
    heure: heureStr,
  };

  if (bijouxLignes.length > 0) {
    const factureLignes: FactureVenteLigne[] = bijouxLignes.map((l: VenteLigne) => ({
      titre: [l.metal, l.qualite].filter(Boolean).join(" ") || "—",
      designation: l.designation,
      poids: l.poids ?? 0,
      quantite: l.quantite,
      prixUnitaireHT: l.prix_unitaire,
      totalHT: l.prix_total,
    }));
    const bijouxHT = bijouxLignes.reduce((s: number, l: VenteLigne) => s + l.prix_total, 0);
    const bijouxTaxe = bijouxLignes.reduce((s: number, l: VenteLigne) => s + l.montant_taxe, 0);
    const bijouxTTC = bijouxHT + bijouxTaxe;

    const facturePath = await generateDocument({
      type: "facture_vente",
      lotId: lot.id,
      dossierId: dossier.id,
      clientId: dossier.client.id,
      client: venteClientInfo,
      dossier: venteDossierInfo,
      references: [],
      totaux: { totalBrut: bijouxHT, taxe: bijouxTaxe, netAPayer: bijouxTTC },
      factureVenteLignes: factureLignes,
      totalHT: bijouxHT,
      tva: bijouxTaxe,
      totalTTC: bijouxTTC,
      modeReglement: "—",
    });
    if (facturePath) {
      triggerEmail({
        notification_type: "facture_vente",
        lot_id: lot.id,
        dossier_id: dossier.id,
        client_id: dossier.client.id,
        attachment_paths: [facturePath],
      });
    }
  }

  if (orInvestLignes.length > 0) {
    const orInvestTotal = orInvestLignes.reduce((s: number, l: VenteLigne) => s + l.prix_total, 0);
    const orInvestTaxe = orInvestLignes.reduce((s: number, l: VenteLigne) => s + l.montant_taxe, 0);
    const totalTTC = orInvestTotal + orInvestTaxe;
    const montantAcompte = Math.round(totalTTC * 0.1 * 100) / 100;
    const montantSolde = totalTTC - montantAcompte;
    const dateLimite = new Date(now.getTime() + RETRACTATION_DELAY_MS);
    const dateLimiteStr = formatDateTime(dateLimite.toISOString());

    const acompteLignes: FactureVenteLigne[] = orInvestLignes.map((l: VenteLigne) => ({
      titre: [l.metal, l.qualite].filter(Boolean).join(" ") || "—",
      designation: l.designation,
      poids: l.poids ?? 0,
      quantite: l.quantite,
      prixUnitaireHT: l.prix_unitaire,
      totalHT: l.prix_total,
    }));

    const acomptePath = await generateDocument({
      type: "facture_acompte",
      lotId: lot.id,
      dossierId: dossier.id,
      clientId: dossier.client.id,
      client: venteClientInfo,
      dossier: venteDossierInfo,
      references: [],
      totaux: { totalBrut: orInvestTotal, taxe: orInvestTaxe, netAPayer: totalTTC },
      factureVenteLignes: acompteLignes,
      totalHT: orInvestTotal,
      tva: orInvestTaxe,
      totalTTC,
      acomptePourcentage: 10,
      montantAcompte,
      montantSolde,
      dateLimiteSolde: dateLimiteStr,
    });
    if (acomptePath) {
      triggerEmail({
        notification_type: "facture_acompte",
        lot_id: lot.id,
        dossier_id: dossier.id,
        client_id: dossier.client.id,
        attachment_paths: [acomptePath],
      });
    }

    const { data: acompteDoc } = await supabase
      .from("documents")
      .select("numero")
      .eq("lot_id", lot.id)
      .eq("type", "facture_acompte")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const numeroAcompte = acompteDoc?.numero ?? "";

    const soldePath = await generateDocument({
      type: "facture_solde",
      lotId: lot.id,
      dossierId: dossier.id,
      clientId: dossier.client.id,
      client: venteClientInfo,
      dossier: venteDossierInfo,
      references: [],
      totaux: { totalBrut: orInvestTotal, taxe: orInvestTaxe, netAPayer: montantSolde },
      factureVenteLignes: acompteLignes,
      totalHT: orInvestTotal,
      tva: orInvestTaxe,
      totalTTC: totalTTC,
      montantAcompte,
      montantSolde,
      numeroAcompte,
      modeReglement: "—",
      referenceNumero: numeroAcompte,
    });
    if (soldePath) {
      triggerEmail({
        notification_type: "facture_vente",
        lot_id: lot.id,
        dossier_id: dossier.id,
        client_id: dossier.client.id,
        attachment_paths: [soldePath],
      });
    }

    {
      const { error } = await mutate(
        supabase.from("lots").update({
          acompte_montant: montantAcompte,
          date_limite_solde: dateLimite.toISOString(),
        }).eq("id", lot.id),
        "Erreur lors de la mise à jour de l'acompte du lot"
      );
      if (error) return { success: false };
    }
  }

  {
    const { error } = await mutate(
      supabase
        .from("lots")
        .update({ status: "en_cours" })
        .eq("id", lot.id),
      "Erreur lors du passage du lot vente en cours"
    );
    if (error) return { success: false };
  }

  return { success: true };
}
