import { mutate } from "@/lib/supabase/mutation";
import { createBijouxStockEntry, incrementOrInvestStock, restituerReference } from "./stock-operations";
import { generateQuittanceSingleRef } from "./document-operations";
import type { ActionResult, ActionContext, SupabaseClient } from "./action-types";
import type { LotReference } from "@/types/lot";

/**
 * Check if all references in a lot are terminal, and if so finalize the lot and possibly the dossier.
 */
async function checkAndFinalizeLot(supabase: SupabaseClient, lotId: string, dossierId: string): Promise<void> {
  const { data: refs } = await supabase
    .from("lot_references")
    .select("status")
    .eq("lot_id", lotId);

  const allTerminal = (refs ?? []).every(
    (r: { status: string }) => r.status === "finalise" || r.status === "devis_refuse" || r.status === "retracte"
  );

  if (!allTerminal) return;

  await mutate(
    supabase
      .from("lots")
      .update({ status: "finalise", date_finalisation: new Date().toISOString() })
      .eq("id", lotId),
    "Erreur lors de la finalisation du lot"
  );

  // Check if all lots in the dossier are done
  const { data: allLots } = await supabase
    .from("lots")
    .select("status")
    .eq("dossier_id", dossierId);

  const allDone = (allLots ?? []).every(
    (l: { status: string }) => l.status === "finalise" || l.status === "termine"
  );

  if (allDone) {
    await mutate(
      supabase
        .from("dossiers")
        .update({ status: "finalise" })
        .eq("id", dossierId),
      "Erreur lors de la finalisation du dossier"
    );
  }
}

/**
 * Validate a bijoux rachat reference: create stock entry, generate quittance, finalize.
 */
export async function executeValiderRachat(
  supabase: SupabaseClient,
  ctx: ActionContext,
  refId: string
): Promise<ActionResult> {
  const ref = ctx.lot.references.find((r) => r.id === refId);
  if (!ref || ref.categorie !== "bijoux") return { success: false, error: "Reference non trouvee" };

  const { error: stockErr } = await createBijouxStockEntry({
    supabase,
    ref,
    lotId: ctx.lot.id,
    isDepotVente: false,
  });
  if (stockErr) return { success: false };

  // Mark as finalized (stock-operations already set route_stock, override to finalise)
  const { error: e2 } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: "finalise" })
      .eq("id", refId),
    "Erreur lors de la finalisation de la reference"
  );
  if (e2) return { success: false };

  await generateQuittanceSingleRef(ctx, ref);
  await checkAndFinalizeLot(supabase, ctx.lot.id, ctx.dossier.id);

  return { success: true };
}

/**
 * Retract a single reference.
 */
export async function executeRetracterRef(
  supabase: SupabaseClient,
  ctx: ActionContext,
  refId: string
): Promise<ActionResult> {
  const { error } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: "retracte" })
      .eq("id", refId),
    "Erreur lors de la retractation de la reference"
  );
  if (error) return { success: false };

  await checkAndFinalizeLot(supabase, ctx.lot.id, ctx.dossier.id);
  return { success: true };
}

/**
 * Accept a devis for a single reference.
 * - Or invest: immediate finalize + stock increment
 * - Bijoux: start 48h retractation
 */
export async function executeAccepterDevisRef(
  supabase: SupabaseClient,
  ctx: ActionContext,
  refId: string
): Promise<ActionResult> {
  const ref = ctx.lot.references.find((r) => r.id === refId);
  if (!ref) return { success: false, error: "Reference non trouvee" };

  if (ref.categorie === "or_investissement" && ref.or_investissement_id) {
    const { error: stockErr } = await incrementOrInvestStock({ supabase, ref });
    if (stockErr) return { success: false };

    const { error: e2 } = await mutate(
      supabase
        .from("lot_references")
        .update({ status: "finalise" })
        .eq("id", refId),
      "Erreur lors de la finalisation de la reference"
    );
    if (e2) return { success: false };
  } else {
    const now = new Date();
    const delai = new Date(now.getTime() + ctx.retractationMs);
    const { error: e3 } = await mutate(
      supabase
        .from("lot_references")
        .update({
          status: "en_retractation",
          date_envoi: now.toISOString(),
          date_fin_delai: delai.toISOString(),
        })
        .eq("id", refId),
      "Erreur lors de la mise en retractation de la reference"
    );
    if (e3) return { success: false };
  }

  await checkAndFinalizeLot(supabase, ctx.lot.id, ctx.dossier.id);
  return { success: true };
}

/**
 * Refuse a devis for a single reference.
 */
export async function executeRefuserDevisRef(
  supabase: SupabaseClient,
  ctx: ActionContext,
  refId: string
): Promise<ActionResult> {
  const { error } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: "devis_refuse" })
      .eq("id", refId),
    "Erreur lors du refus du devis"
  );
  if (error) return { success: false };

  await checkAndFinalizeLot(supabase, ctx.lot.id, ctx.dossier.id);
  return { success: true };
}

/**
 * Restitute a depot-vente reference.
 */
export async function executeRestituerRef(
  supabase: SupabaseClient,
  _ctx: ActionContext,
  refId: string,
  ref: LotReference
): Promise<ActionResult> {
  const { error } = await restituerReference({ supabase, ref });
  if (error) return { success: false };
  return { success: true };
}
