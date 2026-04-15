import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BonCommandeDetailPage } from "@/components/commandes/bon-commande-detail-page";
import type { BonCommande } from "@/types/bon-commande";
import type { VenteLigne } from "@/types/vente";
import type { Reglement } from "@/types/reglement";
import type { DocumentRecord } from "@/types/document";

export default async function BonCommandeDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bdc } = await supabase
    .from("bons_commande")
    .select("*, fonderie:fonderies(*)")
    .eq("id", id)
    .single();

  if (!bdc) notFound();

  const { data: lignes } = await supabase
    .from("vente_lignes")
    .select("*")
    .eq("bon_commande_id", id)
    .order("created_at", { ascending: true });

  const bonCommande = {
    ...bdc,
    lignes: (lignes ?? []) as VenteLigne[],
  } as BonCommande;

  // Fetch reglements + documents in parallel
  const lotIds = [...new Set((lignes ?? []).map((l) => l.lot_id))];

  const [{ data: reglements }, { data: documents }] = await Promise.all([
    supabase
      .from("reglements")
      .select("*")
      .eq("type", "fonderie")
      .eq("bon_commande_id", id)
      .order("date_reglement", { ascending: true }),
    lotIds.length > 0
      ? supabase
          .from("documents")
          .select("*")
          .eq("type", "bon_commande")
          .in("lot_id", lotIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <BonCommandeDetailPage
      bdc={bonCommande}
      reglements={(reglements ?? []) as Reglement[]}
      documents={(documents ?? []) as DocumentRecord[]}
    />
  );
}
