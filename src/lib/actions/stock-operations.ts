import { mutate } from "@/lib/supabase/mutation";
import type { LotReference } from "@/types/lot";
import type { SupabaseClient } from "./action-types";

/**
 * Create a bijoux_stock entry from a lot reference and link it back.
 */
export async function createBijouxStockEntry({
  supabase,
  ref,
  lotId,
  isDepotVente = false,
  clientId,
}: {
  supabase: SupabaseClient;
  ref: LotReference;
  lotId: string;
  isDepotVente?: boolean;
  clientId?: string;
}): Promise<{ stockId: string | null; error: boolean }> {
  const stockPayload: Record<string, unknown> = {
    nom: ref.designation,
    metaux: ref.metal,
    qualite: ref.qualite,
    poids: ref.poids,
    prix_achat: ref.prix_achat,
    prix_revente: ref.prix_revente_estime,
    quantite: ref.quantite,
    statut: isDepotVente ? "en_depot_vente" : "en_stock",
  };

  if (isDepotVente) {
    stockPayload.depot_vente_lot_id = lotId;
    if (clientId) stockPayload.deposant_client_id = clientId;
  }

  const { data: stockEntry, error: stockError } = await mutate(
    supabase
      .from("bijoux_stock")
      .insert(stockPayload)
      .select("id")
      .single(),
    "Erreur lors de la creation de l'entree stock bijoux"
  );
  if (stockError) return { stockId: null, error: true };

  // Link stock entry to reference
  const newStatus = isDepotVente ? "en_depot_vente" : "route_stock";
  const { error: refError } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: newStatus, destination_stock_id: stockEntry?.id ?? null })
      .eq("id", ref.id),
    "Erreur lors de la mise a jour de la reference"
  );

  return { stockId: stockEntry?.id ?? null, error: !!refError };
}

/**
 * Increment or_investissement stock quantity and mark reference as finalised.
 */
export async function incrementOrInvestStock({
  supabase,
  ref,
}: {
  supabase: SupabaseClient;
  ref: LotReference;
}): Promise<{ error: boolean }> {
  if (!ref.or_investissement_id) return { error: true };

  const { error: rpcError } = await mutate(
    supabase.rpc("increment_or_invest_quantite", {
      p_id: ref.or_investissement_id,
      p_qty: ref.quantite,
    }),
    "Erreur lors de l'incrementation du stock or investissement"
  );
  if (rpcError) return { error: true };

  const { error: refError } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: "route_stock" })
      .eq("id", ref.id),
    "Erreur lors de la mise a jour du statut de la reference"
  );

  return { error: !!refError };
}

/**
 * Restitute a depot-vente reference (mark as rendu_client + update stock).
 */
export async function restituerReference({
  supabase,
  ref,
}: {
  supabase: SupabaseClient;
  ref: LotReference;
}): Promise<{ error: boolean }> {
  const { error: e1 } = await mutate(
    supabase
      .from("lot_references")
      .update({ status: "rendu_client" })
      .eq("id", ref.id),
    "Erreur lors de la restitution de la reference"
  );
  if (e1) return { error: true };

  if (ref.destination_stock_id) {
    const { error: e2 } = await mutate(
      supabase
        .from("bijoux_stock")
        .update({ statut: "rendu_client" })
        .eq("id", ref.destination_stock_id),
      "Erreur lors de la mise a jour du stock"
    );
    if (e2) return { error: true };
  }

  return { error: false };
}
