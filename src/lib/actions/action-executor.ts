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

    // Document actions
    case "doc.signer_contrat_dpv": {
      // 1. Marquer le contrat comme signé
      const { error } = await supabase
        .from("documents")
        .update({ status: "signe" })
        .eq("lot_id", ctx.lot.id)
        .eq("type", "contrat_depot_vente");
      if (error) return { success: false, error: error.message };

      // 2. Marquer les confiés d'achat comme signés aussi
      await supabase
        .from("documents")
        .update({ status: "signe" })
        .eq("lot_id", ctx.lot.id)
        .eq("type", "confie_achat")
        .in("status", ["en_attente"]);

      // 3. Créer les entrées stock et passer les refs en en_depot_vente
      const clientId = ctx.dossier.client.id;
      for (const ref of ctx.lot.references) {
        if (ref.categorie === "bijoux" && ref.status === "en_expertise") {
          const { data: stockEntry, error: stockErr } = await supabase
            .from("bijoux_stock")
            .insert({
              nom: ref.designation,
              metaux: ref.metal,
              qualite: ref.qualite,
              poids: ref.poids_net ?? ref.poids,
              poids_brut: ref.poids_brut,
              poids_net: ref.poids_net,
              prix_achat: ref.prix_achat,
              prix_revente: ref.prix_revente_estime,
              quantite: ref.quantite,
              statut: "en_depot_vente",
              depot_vente_lot_id: ctx.lot.id,
              deposant_client_id: clientId,
            })
            .select("id")
            .single();
          if (stockErr) return { success: false, error: `Erreur création stock: ${stockErr.message}` };
          if (stockEntry) {
            await supabase
              .from("lot_references")
              .update({ status: "en_depot_vente", destination_stock_id: stockEntry.id })
              .eq("id", ref.id);
          }
        }
      }

      return { success: true };
    }

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
      if (!ref) return { success: false, error: "Référence non trouvée" };
      return executeRestituerRef(supabase, ctx, referenceId, ref);
    }

    default:
      return { success: false, error: `Action inconnue: ${actionId}` };
  }
}
