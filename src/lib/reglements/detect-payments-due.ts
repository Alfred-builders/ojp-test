import type { Lot, LotReference } from "@/types/lot";
import type { VenteLigne } from "@/types/vente";
import type { Reglement, ReglementType, ReglementSens } from "@/types/reglement";
import type { BonCommande } from "@/types/bon-commande";
import type { DocumentRecord } from "@/types/document";

export interface PaymentDuePreFill {
  type: ReglementType;
  sens: ReglementSens;
  montant: number;
  client_id?: string;
  fonderie_id?: string;
  bon_commande_id?: string;
  document_id?: string;
}

export interface PaymentDue {
  type: ReglementType;
  sens: ReglementSens;
  label: string;
  description: string;
  montant_attendu: number;
  montant_deja_paye: number;
  montant_restant: number;
  is_fully_paid: boolean;
  pre_fill: PaymentDuePreFill;
}

function sumReglements(reglements: Reglement[], type: ReglementType): number {
  return reglements
    .filter((r) => r.type === type)
    .reduce((sum, r) => sum + r.montant, 0);
}

const DOC_TYPE_MAP: Record<string, string> = {
  vente: "facture_vente",
  acompte: "facture_acompte",
  solde: "facture_solde",
  rachat: "quittance_rachat",
  depot_vente: "quittance_depot_vente",
};

function findDocument(documents: DocumentRecord[], lotId: string, reglementType: string): DocumentRecord | undefined {
  const docType = DOC_TYPE_MAP[reglementType];
  if (!docType) return undefined;
  const candidates = documents.filter((d) => d.lot_id === lotId && d.type === docType);
  return candidates.find((d) => d.status !== "regle") ?? candidates[0];
}

function findDocumentId(documents: DocumentRecord[], lotId: string, reglementType: string): string | undefined {
  const docType = DOC_TYPE_MAP[reglementType];
  if (!docType) return undefined;
  const candidates = documents.filter((d) => d.lot_id === lotId && d.type === docType);
  // Prefer a document that is not yet "regle" (useful for mixed lots with multiple quittances)
  return candidates.find((d) => d.status !== "regle")?.id ?? candidates[0]?.id;
}

interface DetectParams {
  lot: Lot;
  lignes?: VenteLigne[];
  lotReferences?: LotReference[];
  reglements: Reglement[];
  bonsCommande?: BonCommande[];
  documents?: DocumentRecord[];
  clientId?: string;
  acompte_pct?: number;
}

export function detectPaymentsDue({
  lot,
  lignes = [],
  lotReferences = [],
  reglements,
  bonsCommande = [],
  documents = [],
  clientId,
  acompte_pct = 10,
}: DetectParams): PaymentDue[] {
  const payments: PaymentDue[] = [];

  // --- RACHAT en_cours : paiement par quittance non réglée ---
  if (lot.type === "rachat" && lot.status === "en_cours") {
    const unregedQuittances = documents.filter(
      (d) => d.lot_id === lot.id && d.type === "quittance_rachat" && d.status !== "regle"
    );
    for (const quittanceDoc of unregedQuittances) {
      // Find refs linked to this quittance that are en_attente_paiement
      const docWithRefs = quittanceDoc as { document_references?: { lot_reference_id: string }[] };
      const linkedRefIds = new Set(
        (docWithRefs.document_references ?? []).map((dr) => dr.lot_reference_id)
      );
      const linkedRefs = lotReferences.filter(
        (r) => linkedRefIds.has(r.id) && r.status === "en_attente_paiement"
      );
      if (linkedRefs.length === 0) continue;

      const attendu = linkedRefs.reduce(
        (sum, r) => sum + (r.prix_achat - r.montant_taxe) * r.quantite,
        0
      );
      const dejaPaye = reglements
        .filter((r) => r.type === "rachat" && r.document_id === quittanceDoc.id)
        .reduce((sum, r) => sum + r.montant, 0);
      const restant = Math.round(Math.max(0, attendu - dejaPaye) * 100) / 100;
      payments.push({
        type: "rachat",
        sens: "sortant",
        label: `Quittance ${quittanceDoc.numero} | Paiement client à effectuer`,
        description: "Montant net de la quittance de rachat à verser au client",
        montant_attendu: attendu,
        montant_deja_paye: dejaPaye,
        montant_restant: restant,
        is_fully_paid: restant < 0.01,
        pre_fill: {
          type: "rachat",
          sens: "sortant",
          montant: restant,
          client_id: clientId,
          document_id: quittanceDoc.id,
        },
      });
    }
  }

  // --- RACHAT : on paie le client ---
  if (lot.type === "rachat" && lot.status === "finalise") {
    const attendu = lot.montant_net;
    const dejaPaye = sumReglements(reglements, "rachat");
    const restant = Math.round(Math.max(0, attendu - dejaPaye) * 100) / 100;
    payments.push({
      type: "rachat",
      sens: "sortant",
      label: "Rachat | Paiement client à effectuer",
      description: "Montant net du rachat à verser au client",
      montant_attendu: attendu,
      montant_deja_paye: dejaPaye,
      montant_restant: restant,
      is_fully_paid: restant < 0.01,
      pre_fill: {
        type: "rachat",
        sens: "sortant",
        montant: restant,
        client_id: clientId,
        document_id: findDocumentId(documents, lot.id, "rachat"),
      },
    });
  }

  // --- VENTE ---
  if (lot.type === "vente" && lot.status === "en_cours") {
    const hasOrInvest = lignes.some((l) => l.or_investissement_id);
    const bijouxLignes = lignes.filter((l) => !l.or_investissement_id);
    const orInvestLignes = lignes.filter((l) => l.or_investissement_id);

    // Bijoux : paiement direct
    if (bijouxLignes.length > 0) {
      const totalBijoux = bijouxLignes.reduce(
        (sum, l) => sum + l.prix_total + l.montant_taxe,
        0
      );
      const dejaPaye = sumReglements(reglements, "vente");
      const restant = Math.round(Math.max(0, totalBijoux - dejaPaye) * 100) / 100;
      payments.push({
        type: "vente",
        sens: "entrant",
        label: `Facture ${findDocument(documents, lot.id, "vente")?.numero ?? ""} | Encaissement client`.replace("  ", " "),
        description: "Montant TTC de la vente bijoux",
        montant_attendu: totalBijoux,
        montant_deja_paye: dejaPaye,
        montant_restant: restant,
        is_fully_paid: restant < 0.01,
        pre_fill: {
          type: "vente",
          sens: "entrant",
          montant: restant,
          client_id: clientId,
          document_id: findDocumentId(documents, lot.id, "vente"),
        },
      });
    }

    // Or investissement : acompte + solde
    if (hasOrInvest && orInvestLignes.length > 0) {
      const totalOrInvest = orInvestLignes.reduce(
        (sum, l) => sum + l.prix_total + l.montant_taxe,
        0
      );
      const acompteRate = acompte_pct / 100;
      const montantAcompte = Math.round(totalOrInvest * acompteRate * 100) / 100;
      const montantSolde = totalOrInvest - montantAcompte;

      // Acompte
      const acomptePaye = sumReglements(reglements, "acompte");
      const acompteRestant = Math.round(Math.max(0, montantAcompte - acomptePaye) * 100) / 100;
      payments.push({
        type: "acompte",
        sens: "entrant",
        label: `Facture ${findDocument(documents, lot.id, "acompte")?.numero ?? ""} | Acompte client à encaisser (${acompte_pct}%)`.replace("  ", " "),
        description: `Acompte de ${acompte_pct}% sur ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(totalOrInvest)}`,
        montant_attendu: montantAcompte,
        montant_deja_paye: acomptePaye,
        montant_restant: acompteRestant,
        is_fully_paid: acompteRestant < 0.01,
        pre_fill: {
          type: "acompte",
          sens: "entrant",
          montant: acompteRestant,
          client_id: clientId,
          document_id: findDocumentId(documents, lot.id, "acompte"),
        },
      });

      // Solde (visible seulement si acompte payé)
      if (acompteRestant < 0.01) {
        const soldePaye = sumReglements(reglements, "solde");
        const soldeRestant = Math.round(Math.max(0, montantSolde - soldePaye) * 100) / 100;
        payments.push({
          type: "solde",
          sens: "entrant",
          label: `Facture ${findDocument(documents, lot.id, "solde")?.numero ?? ""} | Solde client à encaisser (${100 - acompte_pct}%)`.replace("  ", " "),
          description: `Solde restant après acompte de ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(montantAcompte)}`,
          montant_attendu: montantSolde,
          montant_deja_paye: soldePaye,
          montant_restant: soldeRestant,
          is_fully_paid: soldeRestant < 0.01,
          pre_fill: {
            type: "solde",
            sens: "entrant",
            montant: soldeRestant,
            client_id: clientId,
            document_id: findDocumentId(documents, lot.id, "solde"),
          },
        });
      }
    }
  }

  // --- DEPOT-VENTE : paiement net déposant par quittance non réglée ---
  if (lot.type === "depot_vente" && (lot.status === "en_cours" || lot.status === "finalise")) {
    const unregedQdv = documents.filter(
      (d) => d.lot_id === lot.id && d.type === "quittance_depot_vente" && d.status !== "regle"
    );
    for (const qdvDoc of unregedQdv) {
      const docWithRefs = qdvDoc as { document_references?: { lot_reference_id: string }[] };
      const linkedRefIds = new Set(
        (docWithRefs.document_references ?? []).map((dr) => dr.lot_reference_id)
      );
      const linkedRefs = lotReferences.filter((r) => linkedRefIds.has(r.id));
      if (linkedRefs.length === 0) continue;

      const totalNetDeposant = linkedRefs.reduce(
        (sum, r) => sum + r.prix_achat * r.quantite,
        0
      );
      const dejaPaye = reglements
        .filter((r) => r.type === "depot_vente" && r.document_id === qdvDoc.id)
        .reduce((sum, r) => sum + r.montant, 0);
      const restant = Math.round(Math.max(0, totalNetDeposant - dejaPaye) * 100) / 100;
      payments.push({
        type: "depot_vente",
        sens: "sortant",
        label: `Quittance ${qdvDoc.numero} | Net déposant à verser`,
        description: `Montant dû au déposant pour ${linkedRefs.length} article${linkedRefs.length > 1 ? "s" : ""} vendu${linkedRefs.length > 1 ? "s" : ""}`,
        montant_attendu: totalNetDeposant,
        montant_deja_paye: dejaPaye,
        montant_restant: restant,
        is_fully_paid: restant < 0.01,
        pre_fill: {
          type: "depot_vente",
          sens: "sortant",
          montant: restant,
          client_id: clientId,
          document_id: qdvDoc.id,
        },
      });
    }
  }

  // --- FONDERIE : paiement par bon de commande ---
  for (const bdc of bonsCommande) {
    if (bdc.statut === "annule" || bdc.statut === "paye") continue;

    const dejaPaye = reglements
      .filter((r) => r.type === "fonderie" && r.bon_commande_id === bdc.id)
      .reduce((sum, r) => sum + r.montant, 0);
    const restant = Math.round(Math.max(0, bdc.montant_total - dejaPaye) * 100) / 100;

    if (restant >= 0.01) {
      payments.push({
        type: "fonderie",
        sens: "sortant",
        label: `Bon de commande ${bdc.numero} | Paiement fonderie à effectuer`,
        description: `Bon de commande ${bdc.numero}${bdc.fonderie?.nom ? ` (${bdc.fonderie.nom})` : ""}`,
        montant_attendu: bdc.montant_total,
        montant_deja_paye: dejaPaye,
        montant_restant: restant,
        is_fully_paid: false,
        pre_fill: {
          type: "fonderie",
          sens: "sortant",
          montant: restant,
          fonderie_id: bdc.fonderie_id,
          bon_commande_id: bdc.id,
        },
      });
    }
  }

  return payments;
}

/** Check if all required payments for a lot are fully paid */
export function areAllPaymentsMade(paymentsDue: PaymentDue[]): boolean {
  return paymentsDue.length === 0 || paymentsDue.every((p) => p.is_fully_paid);
}
