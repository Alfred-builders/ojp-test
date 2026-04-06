import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BonLivraisonDetailPage } from "@/components/livraisons/bon-livraison-detail-page";
import type { BonLivraison } from "@/types/bon-livraison";

export default async function BonLivraisonDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bdl } = await supabase
    .from("bons_livraison")
    .select("*, fonderie:fonderies(*), lignes:bon_livraison_lignes(*)")
    .eq("id", id)
    .single();

  if (!bdl) notFound();

  return <BonLivraisonDetailPage bdl={bdl as BonLivraison} />;
}
