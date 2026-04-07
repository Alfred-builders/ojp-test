import type { LotAction } from "./action-types";
import type { LotWithReferences, LotReference } from "@/types/lot";

/**
 * Compute all available actions for a lot based on its current status and references.
 * Pure function, no side effects.
 */
export function getAvailableActions(
  lot: LotWithReferences,
  now: Date = new Date()
): LotAction[] {
  const actions: LotAction[] = [];

  if (lot.type === "rachat" || lot.type === "depot_vente") {
    addRachatLotActions(actions, lot, now);
    addRachatRefActions(actions, lot, now);
  }

  return actions;
}

/**
 * Compute lot-level actions for a rachat/depot-vente lot.
 */
function addRachatLotActions(actions: LotAction[], lot: LotWithReferences, now: Date) {
  // Devis envoye → accept or refuse
  if (lot.status === "devis_envoye") {
    actions.push({
      id: "lot.accepter_devis",
      label: "Accepter le devis",
      description: "Le client accepte le devis. Demarre le delai de retractation.",
      category: "transition",
      priority: "urgent",
      icon: "CheckCircle",
      variant: "default",
      scope: "lot",
    });
    actions.push({
      id: "lot.refuser_devis",
      label: "Refuser le devis",
      description: "Le client refuse le devis.",
      category: "transition",
      priority: "normal",
      icon: "XCircle",
      variant: "destructive",
      scope: "lot",
    });
  }

  // En retractation → finalize or retract
  if (lot.status === "en_retractation") {
    const retractEnd = lot.date_fin_retractation ? new Date(lot.date_fin_retractation) : null;
    const canFinalize = retractEnd ? now >= retractEnd : false;

    actions.push({
      id: "lot.finaliser_rachat",
      label: "Finaliser le rachat",
      description: canFinalize
        ? "Le delai de retractation est expire. Finaliser le rachat et mettre en stock."
        : "En attente de l'expiration du delai de retractation.",
      category: "transition",
      priority: canFinalize ? "urgent" : "info",
      icon: "Stamp",
      variant: "default",
      scope: "lot",
      disabled: !canFinalize,
      disabledReason: canFinalize ? undefined : "Delai de retractation en cours",
    });

    actions.push({
      id: "lot.retracter",
      label: "Client se retracte",
      description: "Le client exerce son droit de retractation.",
      category: "transition",
      priority: "normal",
      icon: "ArrowCounterClockwise",
      variant: "destructive",
      scope: "lot",
    });
  }
}

/**
 * Compute reference-level actions.
 */
function addRachatRefActions(actions: LotAction[], lot: LotWithReferences, now: Date) {
  const isDepotVente = lot.type === "depot_vente";

  for (const ref of lot.references) {
    // En retractation (per-ref): validate or retract after delay
    if (ref.status === "en_retractation" && ref.date_fin_delai) {
      const canAct = now >= new Date(ref.date_fin_delai);
      if (canAct) {
        actions.push({
          id: "ref.valider_rachat",
          label: "Valider le rachat",
          description: `Valider la reference "${ref.designation}" et la mettre en stock.`,
          category: "transition",
          priority: "urgent",
          icon: "Stamp",
          variant: "default",
          scope: "reference",
          referenceId: ref.id,
          referenceDesignation: ref.designation,
        });
        actions.push({
          id: "ref.retracter",
          label: "Retractation",
          description: `Le client se retracte pour "${ref.designation}".`,
          category: "transition",
          priority: "normal",
          icon: "ArrowCounterClockwise",
          variant: "destructive",
          scope: "reference",
          referenceId: ref.id,
          referenceDesignation: ref.designation,
        });
      }
    }

    // Devis envoye (per-ref): accept or refuse after delay
    if (ref.status === "devis_envoye" && ref.date_fin_delai) {
      const canAct = now >= new Date(ref.date_fin_delai);
      if (canAct) {
        actions.push({
          id: "ref.accepter_devis",
          label: "Accepter le devis",
          description: `Le client accepte le devis pour "${ref.designation}".`,
          category: "transition",
          priority: "urgent",
          icon: "CheckCircle",
          variant: "default",
          scope: "reference",
          referenceId: ref.id,
          referenceDesignation: ref.designation,
        });
        actions.push({
          id: "ref.refuser_devis",
          label: "Refuser le devis",
          description: `Le client refuse le devis pour "${ref.designation}".`,
          category: "transition",
          priority: "normal",
          icon: "XCircle",
          variant: "destructive",
          scope: "reference",
          referenceId: ref.id,
          referenceDesignation: ref.designation,
        });
      }
    }

    // Depot-vente finalized: restitution
    if (isDepotVente && lot.status === "finalise" && ref.status === "en_depot_vente") {
      actions.push({
        id: "ref.restituer",
        label: "Restituer",
        description: `Restituer "${ref.designation}" au client.`,
        category: "transition",
        priority: "normal",
        icon: "ArrowUUpLeft",
        variant: "secondary",
        scope: "reference",
        referenceId: ref.id,
        referenceDesignation: ref.designation,
      });
    }
  }
}

/**
 * Get a summary of pending actions for display on the dossier page.
 */
export function getActionSummary(actions: LotAction[]): {
  urgent: LotAction[];
  normal: LotAction[];
  info: LotAction[];
  total: number;
} {
  const urgent = actions.filter((a) => a.priority === "urgent" && !a.disabled);
  const normal = actions.filter((a) => a.priority === "normal" && !a.disabled);
  const info = actions.filter((a) => a.priority === "info" || a.disabled);
  return { urgent, normal, info, total: urgent.length + normal.length };
}
