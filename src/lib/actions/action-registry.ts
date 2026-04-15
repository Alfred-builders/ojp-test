import type { LotAction } from "./action-types";
import type { LotWithReferences } from "@/types/lot";
import type { DocumentRecord, DocumentWithRefs } from "@/types/document";
import type { PaymentDue } from "@/lib/reglements/detect-payments-due";
import type { VenteLigne } from "@/types/vente";
import type { BonCommande } from "@/types/bon-commande";

function lotHref(lot: { id: string; type: string }): string {
  if (lot.type === "vente") return `/ventes/${lot.id}`;
  if (lot.type === "depot_vente") return `/depot-vente/${lot.id}`;
  return `/lots/${lot.id}`;
}

/**
 * Compute all available actions for a lot.
 */
export function getAvailableActions(params: {
  lot: LotWithReferences;
  now?: Date;
  documents?: (DocumentRecord | DocumentWithRefs)[];
  paymentsDue?: PaymentDue[];
  venteLignes?: VenteLigne[];
  bonsCommande?: BonCommande[];
}): LotAction[] {
  const {
    lot,
    now = new Date(),
    documents = [],
    paymentsDue = [],
    venteLignes = [],
    bonsCommande = [],
  } = params;
  const actions: LotAction[] = [];

  if (lot.type === "rachat") {
    addRachatActions(actions, lot, documents, now);
  }

  if (lot.type === "depot_vente") {
    addRachatActions(actions, lot, documents, now);
    addDepotVenteActions(actions, lot, documents);
  }

  if (lot.type === "vente") {
    addVenteActions(actions, lot, venteLignes, bonsCommande);
  }

  addPaymentActions(actions, lot, paymentsDue);

  return actions;
}

// ── RACHAT ──────────────────────────────────────────────────

function addRachatActions(
  actions: LotAction[],
  lot: LotWithReferences,
  documents: (DocumentRecord | DocumentWithRefs)[],
  now: Date
) {
  const lotDocs = documents.filter((d) => d.lot_id === lot.id);

  // ── Lot en_cours : actions dérivées des statuts des références ──
  if (lot.status === "en_cours") {
    const refsDevis = lot.references.filter(
      (r) => r.status === "devis_envoye"
    );
    if (refsDevis.length > 0) {
      const devisDoc = lotDocs.find((d) => d.type === "devis_rachat");
      actions.push({
        id: "lot.accepter_devis",
        label: devisDoc
          ? `Devis ${devisDoc.numero} | En attente de réponse client`
          : "Devis | En attente de réponse client",
        description: "Devis de rachat en attente d'acceptation du client",
        category: "document",
        priority: "urgent",
        icon: "FileText",
        variant: "default",
        scope: "lot",
        lotHref: lotHref(lot),
        documentId: devisDoc?.id,
      });
      actions.push({
        id: "lot.refuser_devis",
        label: "Refuser",
        description: "Le client refuse le devis",
        category: "document",
        priority: "normal",
        icon: "XCircle",
        variant: "destructive",
        scope: "lot",
        lotHref: lotHref(lot),
        documentId: devisDoc?.id,
      });
    }

    const refsRetract = lot.references.filter(
      (r) => r.status === "en_retractation"
    );
    if (refsRetract.length > 0) {
      // Une action par contrat de rachat en attente
      const contratDocs = lotDocs.filter((d) => d.type === "contrat_rachat" && d.status === "en_attente");
      const soonestEnd = refsRetract
        .filter((r) => r.date_fin_delai)
        .map((r) => new Date(r.date_fin_delai!))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      const isExpired = soonestEnd ? now >= soonestEnd : false;

      // Expired retractation is auto-processed server-side — only show during active delay
      if (!isExpired) {
        if (contratDocs.length > 0) {
          for (const contrat of contratDocs) {
            actions.push({
              id: "lot.retracter",
              label: `Contrat ${contrat.numero} | Délai de rétractation`,
              description: `Contrat de rachat en attente de validation`,
              category: "document",
              priority: "normal",
              icon: "ArrowCounterClockwise",
              variant: "destructive",
              scope: "lot",
              lotHref: lotHref(lot),
              documentId: contrat.id,
            });
          }
        } else {
          actions.push({
            id: "lot.retracter",
            label: "Contrat | Délai de rétractation",
            description: `${refsRetract.length} référence${refsRetract.length > 1 ? "s" : ""} en rétractation`,
            category: "document",
            priority: "normal",
            icon: "ArrowCounterClockwise",
            variant: "destructive",
            scope: "lot",
            lotHref: lotHref(lot),
          });
        }
      }
    }
  }
}

// ── DEPOT-VENTE ─────────────────────────────────────────────

function addDepotVenteActions(
  actions: LotAction[],
  lot: LotWithReferences,
  documents: (DocumentRecord | DocumentWithRefs)[]
) {
  // Contrat de dépôt-vente à signer
  const contratDpv = documents.find(
    (d) => d.type === "contrat_depot_vente" && d.status !== "signe" && d.status !== "annule"
  );
  if (contratDpv) {
    actions.push({
      id: "doc.signer_contrat_dpv",
      label: "Contrat dépôt-vente | À faire signer",
      description: "Le contrat de dépôt-vente doit être marqué comme signé",
      category: "document",
      priority: "normal",
      icon: "FileText",
      variant: "default",
      scope: "lot",
      documentId: contratDpv.id,
    });
  }

  const enDepotVente = lot.references.filter(
    (r) => r.status === "en_depot_vente"
  );

  if (enDepotVente.length > 0) {
    actions.push({
      id: "ref.restituer",
      label: `Dépôt-vente | ${enDepotVente.length} article${enDepotVente.length > 1 ? "s" : ""} en boutique`,
      description: "Articles en dépôt-vente, possibilité de restituer",
      category: "transition",
      priority: "normal",
      icon: "ArrowUUpLeft",
      variant: "secondary",
      scope: "lot",
      lotHref: undefined,
    });
  }
}

// ── VENTE ───────────────────────────────────────────────────

function addVenteActions(
  actions: LotAction[],
  lot: LotWithReferences,
  venteLignes: VenteLigne[],
  bonsCommande: BonCommande[]
) {
  if (lot.status !== "en_cours") return;

  const lotLignes = venteLignes.filter((l) => l.lot_id === lot.id);

  const pendingFulfillment = lotLignes.filter(
    (l) =>
      l.or_investissement_id &&
      (l.fulfillment === "pending" || l.fulfillment === "a_commander")
  );
  if (pendingFulfillment.length > 0) {
    actions.push({
      id: "vente.livrer",
      label: `${lot.numero} | ${pendingFulfillment.length} référence${pendingFulfillment.length > 1 ? "s" : ""} à commander`,
      description:
        "Références or investissement à dispatcher (stock ou fonderie)",
      category: "delivery",
      priority: "urgent",
      icon: "Package",
      variant: "default",
      scope: "lot",
      lotHref: `/fonderie/routage`,
    });
  }

  // Articles prêts à livrer (servis du stock OU reçus de la fonderie) mais pas encore remis au client
  const pretsALivrer = lotLignes.filter(
    (l) => (l.fulfillment === "servi_stock" || l.fulfillment === "recu") && !l.is_livre
  );
  if (pretsALivrer.length > 0) {
    actions.push({
      id: "vente.livrer_stock" as const,
      label: `${lot.numero} | ${pretsALivrer.length} article${pretsALivrer.length > 1 ? "s" : ""} à livrer au client`,
      description: "Articles en attente de remise au client",
      category: "delivery",
      priority: "normal",
      icon: "Handshake",
      variant: "default",
      scope: "lot",
      lotHref: `/ventes/${lot.id}`,
    });
  }

  const lotBdcIds = new Set(
    lotLignes
      .filter((l) => l.bon_commande_id)
      .map((l) => l.bon_commande_id!)
  );
  for (const bdc of bonsCommande) {
    if (!lotBdcIds.has(bdc.id)) continue;
    if (bdc.statut === "annule") continue;

    // For paid BDCs: check if delivery to client is pending
    // BDC payé : livraison client gérée par vente.livrer_stock (qui couvre recu + servi_stock)
    if (bdc.statut === "paye") continue;

    let label = "";
    let priority: "urgent" | "normal" | "info" = "normal";

    if (bdc.statut === "brouillon") {
      label = `Bon de commande ${bdc.numero} | À envoyer`;
    } else if (bdc.statut === "envoye") {
      label = `Bon de commande ${bdc.numero} | En attente de réception`;
      priority = "info";
    } else if (bdc.statut === "recu") {
      label = `Bon de commande ${bdc.numero} | Paiement fonderie à effectuer`;
      priority = "urgent";
    }

    if (label) {
      actions.push({
        id: "payment.fonderie" as const,
        label,
        description: `Bon de commande ${bdc.numero}`,
        category: "delivery",
        priority,
        icon: "Package",
        variant: "secondary",
        scope: "payment",
        lotHref: `/fonderie/suivi/bdc/${bdc.id}`,
      });
    }
  }
}

// ── PAIEMENTS ───────────────────────────────────────────────

function addPaymentActions(
  actions: LotAction[],
  lot: LotWithReferences,
  paymentsDue: PaymentDue[]
) {
  for (const payment of paymentsDue) {
    if (payment.is_fully_paid) continue;

    actions.push({
      id: `payment.${payment.type}` as LotAction["id"],
      label: payment.label,
      description: `Restant : ${formatEur(payment.montant_restant)}`,
      category: "payment",
      priority: "urgent",
      icon: "Money",
      variant: "default",
      scope: "payment",
      lotHref: lotHref(lot),
      paymentDue: payment,
    });
  }
}

// ── Helpers ─────────────────────────────────────────────────

function remainingTime(end: Date, now: Date): string {
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "expiré";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h${minutes > 0 ? `${minutes}m` : ""}`;
  return `${minutes}m`;
}

function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function getActionSummary(actions: LotAction[]): {
  total: number;
} {
  return { total: actions.filter((a) => !a.disabled).length };
}
