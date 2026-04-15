import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FonderieDetailPage } from "@/components/fonderies/fonderie-detail-page";
import type { Fonderie } from "@/types/fonderie";
import type { BonCommande } from "@/types/bon-commande";
import type { BonLivraison } from "@/types/bon-livraison";
import type { Reglement } from "@/types/reglement";

export default async function FonderieDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [fonderieRes, bdcRes, bdlRes, reglementsRes] = await Promise.all([
    supabase.from("fonderies").select("*").eq("id", id).single(),
    supabase
      .from("bons_commande")
      .select("*")
      .eq("fonderie_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bons_livraison")
      .select("*, lignes:bon_livraison_lignes(*)")
      .eq("fonderie_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reglements")
      .select("*")
      .eq("type", "fonderie")
      .eq("fonderie_id", id)
      .order("date_reglement", { ascending: false }),
  ]);

  if (!fonderieRes.data) return notFound();

  return (
    <FonderieDetailPage
      fonderie={fonderieRes.data as Fonderie}
      bonsCommande={(bdcRes.data ?? []) as BonCommande[]}
      bonsLivraison={(bdlRes.data ?? []) as BonLivraison[]}
      reglements={(reglementsRes.data ?? []) as Reglement[]}
    />
  );
}
