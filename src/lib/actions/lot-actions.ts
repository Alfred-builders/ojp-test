import { mutate } from "@/lib/supabase/mutation";
import { triggerEmail } from "@/lib/email/trigger";
import { createBijouxStockEntry, incrementOrInvestStock } from "./stock-operations";
import { generateQuittanceRachat } from "./document-operations";
import type { ActionResult, ActionContext, SupabaseClient } from "./action-types";

/**
 * Accept a devis at the lot level: block all refs, start retractation.
 */
export async function executeAccepterDevisLot(
  supabase: SupabaseClient,
  ctx: ActionContext
): Promise<ActionResult> {
  const now = new Date();
  const retractEnd = new Date(now.getTime() + ctx.retractationMs);

  const { error: e1 } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: "bloque" })
      .eq("lot_id", ctx.lot.id),
    "Erreur lors du blocage des references"
  );
  if (e1) return { success: false };

  const { error: e2 } = await mutate(
    supabase.from("lots").update({
      status: "en_retractation",
      date_acceptation: now.toISOString(),
      date_fin_retractation: retractEnd.toISOString(),
    }).eq("id", ctx.lot.id),
    "Erreur lors de la mise a jour du lot",
    "Devis accepte"
  );
  if (e2) return { success: false };

  triggerEmail({
    notification_type: "interne_devis_accepte",
    lot_id: ctx.lot.id,
    dossier_id: ctx.dossier.id,
  });

  return { success: true };
}

/**
 * Refuse a devis at the lot level.
 */
export async function executeRefuserDevisLot(
  supabase: SupabaseClient,
  ctx: ActionContext
): Promise<ActionResult> {
  const { error } = await mutate(
    supabase.from("lots").update({ status: "refuse" }).eq("id", ctx.lot.id),
    "Erreur lors du refus du lot",
    "Lot refuse"
  );
  if (error) return { success: false };
  return { success: true };
}

/**
 * Finalize a rachat lot after retractation: process all refs into stock, generate docs.
 */
export async function executeFinaliserRachat(
  supabase: SupabaseClient,
  ctx: ActionContext
): Promise<ActionResult> {
  const isDepotVente = ctx.lot.type === "depot_vente";

  for (const ref of ctx.lot.references) {
    if (ref.categorie === "bijoux") {
      const { error } = await createBijouxStockEntry({
        supabase,
        ref,
        lotId: ctx.lot.id,
        isDepotVente,
        clientId: ctx.dossier.client.id,
      });
      if (error) return { success: false };
    }

    if (ref.categorie === "or_investissement" && ref.or_investissement_id) {
      const { error } = await incrementOrInvestStock({ supabase, ref });
      if (error) return { success: false };
    }
  }

  const { error: lotError } = await mutate(
    supabase.from("lots").update({
      status: "finalise",
      date_finalisation: new Date().toISOString(),
    }).eq("id", ctx.lot.id),
    "Erreur lors de la finalisation du lot",
    "Lot finalise"
  );
  if (lotError) return { success: false };

  // Generate quittance for bijoux references (not for depot-vente)
  if (!isDepotVente) {
    const bijouxRefs = ctx.lot.references.filter((r) => r.categorie === "bijoux");
    if (bijouxRefs.length > 0) {
      await generateQuittanceRachat(ctx, bijouxRefs);
    }
  }

  triggerEmail({
    notification_type: "contrat_rachat_finalise",
    lot_id: ctx.lot.id,
    dossier_id: ctx.dossier.id,
  });

  // Check if all lots in dossier are done
  const { data: allLots } = await supabase
    .from("lots")
    .select("status")
    .eq("dossier_id", ctx.dossier.id);

  const allDone = (allLots ?? []).every(
    (l: { status: string }) => l.status === "finalise" || l.status === "termine"
  );

  if (allDone) {
    await mutate(
      supabase
        .from("dossiers")
        .update({ status: "finalise" })
        .eq("id", ctx.dossier.id),
      "Erreur lors de la finalisation du dossier"
    );
  }

  return { success: true };
}

/**
 * Client retraction: mark all refs as retracted, update lot.
 */
export async function executeRetracterLot(
  supabase: SupabaseClient,
  ctx: ActionContext
): Promise<ActionResult> {
  const { error: e1 } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: "retracte" })
      .eq("lot_id", ctx.lot.id),
    "Erreur lors de la retractation des references"
  );
  if (e1) return { success: false };

  const { error: e2 } = await mutate(
    supabase.from("lots").update({ status: "retracte" }).eq("id", ctx.lot.id),
    "Erreur lors de la retractation du lot",
    "Retractation enregistree"
  );
  if (e2) return { success: false };

  triggerEmail({
    notification_type: "interne_retractation",
    lot_id: ctx.lot.id,
    dossier_id: ctx.dossier.id,
  });

  return { success: true };
}
