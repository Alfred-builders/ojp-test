import { createClient } from "@/lib/supabase/server";
import { getSettingServer } from "@/lib/settings-server";
import { generateQuittanceRachat } from "./quittance-rachat";
import { generateContratRachat } from "./contrat-rachat";
import { generateDevisRachat } from "./devis-rachat";
import { generateContratDepotVente } from "./contrat-depot-vente";
import { generateConfieAchat } from "./confie-achat";
import { generateQuittanceDepotVente } from "./quittance-depot-vente";
import { generateFactureVente } from "./facture-vente";
import { generateFactureAcompte } from "./facture-acompte";
import { generateBonCommande } from "./bon-commande";
import { generateBonLivraison, type BonLivraisonData } from "./bon-livraison";
import { generateFactureSolde } from "./facture-solde";
import { refreshSociete } from "./blocks";
import type { ClientInfo, DossierInfo, ReferenceLigne, TotauxInfo, DepotVenteReferenceLigne, ConfieReferenceLigne, QuittanceDepotVenteLigne, FactureVenteLigne, BonCommandeLigne, FonderieInfo } from "./blocks";
import type { DocumentType } from "@/types/document";

const DEFAULT_PREFIX_MAP: Record<DocumentType, string> = {
  quittance_rachat: "QRA",
  contrat_rachat: "CRA",
  devis_rachat: "DEV",
  contrat_depot_vente: "CDV",
  confie_achat: "CON",
  quittance_depot_vente: "QDV",
  facture_vente: "FVE",
  facture_acompte: "FAC",
  facture_solde: "FSO",
  bon_commande: "CMDF",
  bon_livraison: "BDL",
};

async function getNextNumero(type: DocumentType): Promise<string> {
  const supabase = await createClient();
  const prefixes = await getSettingServer("document_prefixes");
  const prefix = prefixes?.[type] ?? DEFAULT_PREFIX_MAP[type];
  const year = new Date().getFullYear().toString();
  const pattern = `${prefix}-${year}-%`;

  const { data } = await supabase
    .from("documents")
    .select("numero")
    .like("numero", pattern)
    .order("numero", { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0) {
    const last = data[0].numero;
    const match = last.match(/(\d+)$/);
    if (match) seq = parseInt(match[1]) + 1;
  }

  return `${prefix}-${year}-${seq.toString().padStart(4, "0")}`;
}

export interface GenerateDocumentParams {
  type: DocumentType;
  lotId: string;
  dossierId: string;
  clientId: string;
  client: ClientInfo;
  dossier: DossierInfo;
  references: ReferenceLigne[];
  totaux: TotauxInfo;
  // Depot-vente specific
  depotVenteReferences?: DepotVenteReferenceLigne[];
  confieReference?: ConfieReferenceLigne;
  numeroLot?: string;
  // Quittance depot-vente specific
  quittanceDepotVenteLignes?: QuittanceDepotVenteLigne[];
  totalVentes?: number;
  totalCommission?: number;
  venteDossierNumero?: string;
  // Facture vente specific
  factureVenteLignes?: FactureVenteLigne[];
  totalHT?: number;
  tva?: number;
  totalTTC?: number;
  modeReglement?: string;
  // Facture acompte specific
  acomptePourcentage?: number;
  montantAcompte?: number;
  montantSolde?: number;
  dateLimiteSolde?: string;
  // Facture solde specific
  numeroAcompte?: string;
  // Bon de commande specific
  fonderie?: FonderieInfo;
  bonCommandeLignes?: BonCommandeLigne[];
  bonCommandeTotalHT?: number;
  // Link to related document
  referenceNumero?: string;
  // IDs of lot_references included in this document (for document_references junction)
  lotReferenceIds?: string[];
}

export type DocResult = { path: string; error?: never } | { path: null; error: string };

export async function generateAndStoreDocument(params: GenerateDocumentParams): Promise<string | null>;
export async function generateAndStoreDocument(params: GenerateDocumentParams, detailed: true): Promise<DocResult>;
export async function generateAndStoreDocument(params: GenerateDocumentParams, detailed?: boolean): Promise<string | null | DocResult> {
  const { type, lotId, dossierId, clientId, client, dossier, references, totaux } = params;

  const fail = (msg: string) => {
    console.error(`[DOC-STORE] FAIL ${type}:`, msg);
    return detailed ? { path: null, error: msg } as DocResult : null;
  };

  try {
  await refreshSociete();
  const numero = await getNextNumero(type);

  let blob: Blob;
  const data = { numero, client, dossier, references, totaux };

  if (type === "quittance_rachat") {
    blob = await generateQuittanceRachat(data);
  } else if (type === "contrat_rachat") {
    blob = await generateContratRachat(data);
  } else if (type === "contrat_depot_vente") {
    blob = await generateContratDepotVente({
      numero, client, dossier,
      references: params.depotVenteReferences!,
      numeroLot: params.numeroLot!,
    });
  } else if (type === "confie_achat") {
    blob = await generateConfieAchat({
      numero, client, dossier,
      reference: params.confieReference!,
      totaux,
    });
  } else if (type === "quittance_depot_vente") {
    blob = await generateQuittanceDepotVente({
      numero, client, dossier,
      lignes: params.quittanceDepotVenteLignes!,
      totalVentes: params.totalVentes!,
      totalCommission: params.totalCommission!,
      netAPayer: totaux.netAPayer,
      venteDossierNumero: params.venteDossierNumero!,
    });
  } else if (type === "facture_vente") {
    blob = await generateFactureVente({
      numero, client, dossier,
      lignes: params.factureVenteLignes!,
      totalHT: params.totalHT!, tva: params.tva!, totalTTC: params.totalTTC!,
      modeReglement: params.modeReglement!,
    });
  } else if (type === "facture_acompte") {
    blob = await generateFactureAcompte({
      numero, client, dossier,
      lignes: params.factureVenteLignes!,
      totalHT: params.totalHT!, tva: params.tva!, totalTTC: params.totalTTC!,
      acomptePourcentage: params.acomptePourcentage!,
      montantAcompte: params.montantAcompte!, montantSolde: params.montantSolde!,
      dateLimiteSolde: params.dateLimiteSolde!,
    });
  } else if (type === "facture_solde") {
    blob = await generateFactureSolde({
      numero, client, dossier,
      lignes: params.factureVenteLignes!,
      totalHT: params.totalHT!, tva: params.tva!, totalTTC: params.totalTTC!,
      montantAcompte: params.montantAcompte!,
      numeroAcompte: params.numeroAcompte ?? "",
      montantSolde: params.montantSolde!,
      modeReglement: params.modeReglement!,
    });
  } else if (type === "bon_commande") {
    blob = await generateBonCommande({
      numero, dossier,
      fonderie: params.fonderie!,
      lignes: params.bonCommandeLignes!,
      totalHT: params.bonCommandeTotalHT!,
    });
  } else {
    blob = await generateDevisRachat(data);
  }

  // Upload to Supabase Storage
  const filename = `${numero}.pdf`;
  const storagePath = `${dossierId}/${lotId}/${filename}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, blob, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return fail(`Upload: ${uploadError.message}`);
  }

  const emittedTypes = ["quittance_rachat", "quittance_depot_vente", "bon_commande"];
  const initialStatus = emittedTypes.includes(type) ? "emis" : "en_attente";

  const { error: dbError } = await supabase.from("documents").insert({
    type, numero, lot_id: lotId, dossier_id: dossierId, client_id: clientId,
    storage_path: storagePath, status: initialStatus,
    reference_numero: params.referenceNumero ?? null,
  });

  if (dbError) {
    await supabase.storage.from("documents").remove([storagePath]);
    return fail(`DB insert: ${dbError.message}`);
  }

  if (params.lotReferenceIds && params.lotReferenceIds.length > 0) {
    const { data: docRecord } = await supabase
      .from("documents")
      .select("id")
      .eq("storage_path", storagePath)
      .single();

    if (docRecord) {
      const links = params.lotReferenceIds.map((refId) => ({
        document_id: docRecord.id,
        lot_reference_id: refId,
      }));
      await supabase.from("document_references").insert(links);
    }
  }

  console.log("[DOC-STORE] OK:", storagePath);
  return detailed ? { path: storagePath } as DocResult : storagePath;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(`Exception: ${msg}`);
  }
}

/**
 * Generate and store a Bon de Livraison PDF.
 * BDL is not tied to a lot/dossier/client — stored under bdl/{bonLivraisonId}/
 */
export async function generateAndStoreBonLivraison(
  bonLivraisonId: string,
  data: Omit<BonLivraisonData, "numero">,
): Promise<string | null> {
  await refreshSociete();

  const supabase = await createClient();
  const type: DocumentType = "bon_livraison";
  const prefixes = await getSettingServer("document_prefixes");
  const prefix = prefixes?.[type] ?? DEFAULT_PREFIX_MAP[type];
  const year = new Date().getFullYear().toString();
  const pattern = `${prefix}-${year}-%`;

  const { data: existing } = await supabase
    .from("documents")
    .select("numero")
    .like("numero", pattern)
    .order("numero", { ascending: false })
    .limit(1);

  let seq = 1;
  if (existing && existing.length > 0) {
    const match = existing[0].numero.match(/(\d+)$/);
    if (match) seq = parseInt(match[1]) + 1;
  }
  const numero = `${prefix}-${year}-${seq.toString().padStart(4, "0")}`;

  const blob = await generateBonLivraison({ ...data, numero });

  const filename = `${numero}.pdf`;
  const storagePath = `bdl/${bonLivraisonId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, blob, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return null;
  }

  // Store document record linked to bon_livraison
  const { error: dbError } = await supabase.from("documents").insert({
    type,
    numero,
    storage_path: storagePath,
    status: "emis",
    bon_livraison_id: bonLivraisonId,
  });

  if (dbError) {
    console.error("DB error:", dbError);
    await supabase.storage.from("documents").remove([storagePath]);
    return null;
  }

  return storagePath;
}
