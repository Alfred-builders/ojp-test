import type { ActionId, ActionResult, ActionContext, SupabaseClient } from "./action-types";
import type { LotReference } from "@/types/lot";
import {
  executeAccepterDevisLot,
  executeRefuserDevisLot,
  executeFinaliserRachat,
  executeRetracterLot,
} from "./lot-actions";
import {
  executeValiderRachat,
  executeRetracterRef,
  executeAccepterDevisRef,
  executeRefuserDevisRef,
  executeRestituerRef,
} from "./reference-actions";

/**
 * Single entry point for executing any action.
 */
export async function executeAction(params: {
  actionId: ActionId;
  supabase: SupabaseClient;
  ctx: ActionContext;
  referenceId?: string;
}): Promise<ActionResult> {
  const { actionId, supabase, ctx, referenceId } = params;

  switch (actionId) {
    // Lot-level actions
    case "lot.accepter_devis":
      return executeAccepterDevisLot(supabase, ctx);
    case "lot.refuser_devis":
      return executeRefuserDevisLot(supabase, ctx);
    case "lot.finaliser_rachat":
      return executeFinaliserRachat(supabase, ctx);
    case "lot.retracter":
      return executeRetracterLot(supabase, ctx);

    // Reference-level actions
    case "ref.valider_rachat":
      if (!referenceId) return { success: false, error: "referenceId requis" };
      return executeValiderRachat(supabase, ctx, referenceId);
    case "ref.retracter":
      if (!referenceId) return { success: false, error: "referenceId requis" };
      return executeRetracterRef(supabase, ctx, referenceId);
    case "ref.accepter_devis":
      if (!referenceId) return { success: false, error: "referenceId requis" };
      return executeAccepterDevisRef(supabase, ctx, referenceId);
    case "ref.refuser_devis":
      if (!referenceId) return { success: false, error: "referenceId requis" };
      return executeRefuserDevisRef(supabase, ctx, referenceId);
    case "ref.restituer": {
      if (!referenceId) return { success: false, error: "referenceId requis" };
      const ref = ctx.lot.references.find((r) => r.id === referenceId);
      if (!ref) return { success: false, error: "Reference non trouvee" };
      return executeRestituerRef(supabase, ctx, referenceId, ref);
    }

    default:
      return { success: false, error: `Action inconnue: ${actionId}` };
  }
}
