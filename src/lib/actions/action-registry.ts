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
    addDepotVenteActions(actions, lot);
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

  // ── Lot-level devis_envoye ──
  if (lot.status === "devis_envoye") {
    const devisDoc = lotDocs.find((d) => d.type === "devis_rachat");
    actions.push({
      id: "lot.accepter_devis",
      label: devisDoc ? `Devis ${devisDoc.numero} en attente` : "Devis en attente",
      description: "Devis de rachat en attente d'acceptation du client",
      category: "document",
      priority: "urgent",
      icon: "FileText",
      variant: "default",
      scope: "lot",
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
      documentId: devisDoc?.id,
    });
  }

  // ── Lot-level en_retractation (disappears when delay expires) ──
  if (lot.status === "en_retractation") {
    const retractEnd = lot.date_fin_retractation
      ? new Date(lot.date_fin_retractation)
      : null;
    const isExpired = retractEnd ? now >= retractEnd : false;

    if (!isExpired) {
      const contratDoc = lotDocs.find((d) => d.type === "contrat_rachat");
      const remaining = retractEnd ? remainingTime(retractEnd, now) : "";
      actions.push({
        id: "lot.retracter",
        label: contratDoc
          ? `Contrat ${contratDoc.numero} — rétractation (${remaining})`
          : `Rétractation en cours (${remaining})`,
        description: "Le client peut exercer son droit de rétractation",
        category: "document",
        priority: "normal",
        icon: "ArrowCounterClockwise",
        variant: "destructive",
        scope: "lot",
        documentId: contratDoc?.id,
      });
    }
  }

  // ── Lot en_cours : references mixtes, actions derivees des documents ──
  if (lot.status === "en_cours") {
    const refsDevis = lot.references.filter(
      (r) => r.status === "devis_envoye"
    );
    if (refsDevis.length > 0) {
      const devisDoc = lotDocs.find((d) => d.type === "devis_rachat");
      actions.push({
        id: "lot.accepter_devis",
        label: devisDoc
          ? `Devis ${devisDoc.numero} en attente (${refsDevis.length} réf.)`
          : `Devis en attente (${refsDevis.length} réf.)`,
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
      const contratDoc = lotDocs.find((d) => d.type === "contrat_rachat");
      const soonestEnd = refsRetract
        .filter((r) => r.date_fin_delai)
        .map((r) => new Date(r.date_fin_delai!))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      const isExpired = soonestEnd ? now >= soonestEnd : false;

      if (!isExpired && soonestEnd) {
        const remaining = remainingTime(soonestEnd, now);
        actions.push({
          id: "lot.retracter",
          label: contratDoc
            ? `Contrat ${contratDoc.numero} — rétractation (${remaining})`
            : `Rétractation en cours (${remaining})`,
          description: `${refsRetract.length} référence${refsRetract.length > 1 ? "s" : ""} en rétractation`,
          category: "document",
          priority: "normal",
          icon: "ArrowCounterClockwise",
          variant: "destructive",
          scope: "lot",
          lotHref: lotHref(lot),
          documentId: contratDoc?.id,
        });
      }
    }
  }
}

// ── DEPOT-VENTE ─────────────────────────────────────────────

function addDepotVenteActions(
  actions: LotAction[],
  lot: LotWithReferences
) {
  const enDepotVente = lot.references.filter(
    (r) => r.status === "en_depot_vente"
  );

  if (enDepotVente.length > 0) {
    actions.push({
      id: "ref.restituer",
      label: `Dépôt-vente — ${enDepotVente.length} article${enDepotVente.length > 1 ? "s" : ""} en cours`,
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
      label: `${pendingFulfillment.length} référence${pendingFulfillment.length > 1 ? "s" : ""} à commander`,
      description:
        "Références or investissement à dispatcher (stock ou fonderie)",
      category: "delivery",
      priority: "urgent",
      icon: "Package",
      variant: "default",
      scope: "lot",
      lotHref: `/commandes/${lot.id}`,
    });
  }

  const lotBdcIds = new Set(
    lotLignes
      .filter((l) => l.bon_commande_id)
      .map((l) => l.bon_commande_id!)
  );
  for (const bdc of bonsCommande) {
    if (!lotBdcIds.has(bdc.id)) continue;
    if (bdc.statut === "paye" || bdc.statut === "annule") continue;

    let label = "";
    let priority: "urgent" | "normal" | "info" = "normal";

    if (bdc.statut === "brouillon") {
      label = `BdC ${bdc.numero} — à envoyer`;
    } else if (bdc.statut === "envoye") {
      label = `BdC ${bdc.numero} — en attente de réception`;
      priority = "info";
    } else if (bdc.statut === "recu") {
      label = `BdC ${bdc.numero} — reçu, paiement fonderie à faire`;
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
        lotHref: `/commandes/bdc/${bdc.id}`,
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
      label: `Paiement à faire — ${payment.label}`,
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
