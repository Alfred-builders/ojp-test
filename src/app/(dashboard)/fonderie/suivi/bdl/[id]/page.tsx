import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BonLivraisonDetailPage } from "@/components/livraisons/bon-livraison-detail-page";
import type { BonLivraison } from "@/types/bon-livraison";
import type { DocumentRecord } from "@/types/document";

export default async function BonLivraisonDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: bdl }, { data: documents }] = await Promise.all([
    supabase
      .from("bons_livraison")
      .select("*, fonderie:fonderies(*), lignes:bon_livraison_lignes(*)")
      .eq("id", id)
      .single(),
    supabase
      .from("documents")
      .select("*")
      .eq("bon_livraison_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!bdl) notFound();

  return (
    <BonLivraisonDetailPage
      bdl={bdl as BonLivraison}
      documents={(documents ?? []) as DocumentRecord[]}
    />
  );
}
