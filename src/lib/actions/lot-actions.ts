import { mutate } from "@/lib/supabase/mutation";
import { triggerEmail } from "@/lib/email/trigger";
import { createBijouxStockEntry, incrementOrInvestStock } from "./stock-operations";
import { generateQuittanceRachat, generateContratRachat, generateQuittanceOrInvest } from "./document-operations";
import { checkAndFinalizeLot } from "./reference-actions";
import type { ActionResult, ActionContext, SupabaseClient } from "./action-types";

/**
 * Accept a devis at the lot level:
 * - Bijoux devis → contrat de rachat + rétractation 48h
 * - Or investissement devis → quittance de rachat + finalisation immédiate (stock incrémenté)
 */
export async function executeAccepterDevisLot(
  supabase: SupabaseClient,
  ctx: ActionContext
): Promise<ActionResult> {
  const now = new Date();
  const retractEnd = new Date(now.getTime() + ctx.retractationMs);

  // Séparer les refs devis par catégorie
  const devisRefs = ctx.lot.references.filter((r) => r.status === "devis_envoye");
  const bijouxDevis = devisRefs.filter((r) => r.categorie === "bijoux");
  const orInvestDevis = devisRefs.filter((r) => r.categorie === "or_investissement" && r.or_investissement_id);

  // Bijoux devis → en_retractation (48h)
  if (bijouxDevis.length > 0) {
    const { error } = await mutate(
      supabase
        .from("lot_references")
        .update({
          status: "en_retractation",
          date_envoi: now.toISOString(),
          date_fin_delai: retractEnd.toISOString(),
        })
        .eq("lot_id", ctx.lot.id)
        .eq("status", "devis_envoye")
        .eq("categorie", "bijoux"),
      "Erreur lors de la mise en rétractation des bijoux"
    );
    if (error) return { success: false };

    // Générer contrat de rachat pour les bijoux
    await generateContratRachat(ctx, bijouxDevis);
  }

  // Or investissement devis → en attente de paiement (stock incrémenté après paiement)
  for (const ref of orInvestDevis) {
    const { error: refErr } = await mutate(
      supabase
        .from("lot_references")
        .update({ status: "en_attente_paiement" })
        .eq("id", ref.id),
      "Erreur lors de la mise en attente de paiement de la référence"
    );
    if (refErr) return { success: false };
  }

  // Générer quittance de rachat pour l'or investissement
  if (orInvestDevis.length > 0) {
    await generateQuittanceOrInvest(ctx, orInvestDevis);
  }

  // Mettre à jour les dates de rétractation sur le lot
  if (bijouxDevis.length > 0) {
    await supabase.from("lots").update({
      date_acceptation: now.toISOString(),
      date_fin_retractation: retractEnd.toISOString(),
    }).eq("id", ctx.lot.id);
  }

  // Mark devis documents as accepted
  await supabase
    .from("documents")
    .update({ status: "accepte" })
    .eq("lot_id", ctx.lot.id)
    .eq("type", "devis_rachat");

  triggerEmail({
    notification_type: "interne_devis_accepte",
    lot_id: ctx.lot.id,
    dossier_id: ctx.dossier.id,
  });

  // Vérifier si le lot peut être finalisé (si toutes les refs or invest et pas de bijoux)
  await checkAndFinalizeLot(supabase, ctx.lot.id, ctx.dossier.id);

  return { success: true };
}

/**
 * Refuse a devis at the lot level: mark refs as refused, finalize lot with outcome.
 */
export async function executeRefuserDevisLot(
  supabase: SupabaseClient,
  ctx: ActionContext
): Promise<ActionResult> {
  // Mettre toutes les refs devis en devis_refuse
  const { error: e1 } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: "devis_refuse" })
      .eq("lot_id", ctx.lot.id)
      .eq("status", "devis_envoye"),
    "Erreur lors du refus des références"
  );
  if (e1) return { success: false };

  // Mark devis documents as refused
  await supabase
    .from("documents")
    .update({ status: "refuse" })
    .eq("lot_id", ctx.lot.id)
    .eq("type", "devis_rachat");

  // Vérifier si le lot peut être finalisé (toutes refs terminales)
  await checkAndFinalizeLot(supabase, ctx.lot.id, ctx.dossier.id);

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

  // Only process refs that are still in retractation (not already en_attente_paiement or finalise)
  const refsToProcess = ctx.lot.references.filter((r) => r.status === "en_retractation");

  for (const ref of refsToProcess) {
    if (ref.categorie === "bijoux") {
      const { error } = await createBijouxStockEntry({
        supabase,
        ref,
        lotId: ctx.lot.id,
        isDepotVente,
        clientId: ctx.dossier.client.id,
      });
      if (error) return { success: false };

      // Finaliser la ref bijoux (stock créé)
      await mutate(
        supabase.from("lot_references").update({ status: "finalise" }).eq("id", ref.id),
        "Erreur lors de la finalisation de la référence bijoux"
      );
    }

    if (ref.categorie === "or_investissement" && ref.or_investissement_id) {
      // En attente de paiement (stock incrémenté après paiement)
      await mutate(
        supabase.from("lot_references").update({ status: "en_attente_paiement" }).eq("id", ref.id),
        "Erreur lors de la mise en attente de paiement"
      );
    }
  }

  // Bijoux after retractation: contract already exists, just sign it (no new quittance)
  // Quittances are only generated for or_investissement at finalization or devis acceptance

  // Generate quittance for or_investissement refs coming out of retractation (devis flow)
  if (!isDepotVente) {
    const orInvestRefs = refsToProcess.filter((r) => r.categorie === "or_investissement");
    if (orInvestRefs.length > 0) {
      await generateQuittanceOrInvest(ctx, orInvestRefs);
    }
  }

  // Mark contracts as signed
  await supabase
    .from("documents")
    .update({ status: "signe" })
    .eq("lot_id", ctx.lot.id)
    .in("type", ["contrat_rachat", "contrat_depot_vente", "confie_achat"]);

  triggerEmail({
    notification_type: "contrat_rachat_finalise",
    lot_id: ctx.lot.id,
    dossier_id: ctx.dossier.id,
  });

  // Use checkAndFinalizeLot to respect refs still in en_attente_paiement
  await checkAndFinalizeLot(supabase, ctx.lot.id, ctx.dossier.id);

  return { success: true };
}

/**
 * Client retraction: mark refs as retracted, then check if lot can finalize.
 */
export async function executeRetracterLot(
  supabase: SupabaseClient,
  ctx: ActionContext
): Promise<ActionResult> {
  // Rétracter les refs en rétractation
  const { error: e1 } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: "retracte" })
      .eq("lot_id", ctx.lot.id)
      .in("status", ["en_retractation", "bloque"]),
    "Erreur lors de la rétractation des références"
  );
  if (e1) return { success: false };

  triggerEmail({
    notification_type: "interne_retractation",
    lot_id: ctx.lot.id,
    dossier_id: ctx.dossier.id,
  });

  // Vérifier si le lot peut être finalisé
  await checkAndFinalizeLot(supabase, ctx.lot.id, ctx.dossier.id);

  return { success: true };
}
