import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LotDetailPage } from "@/components/lots/lot-detail-page";
import type { LotWithReferences, LotReference } from "@/types/lot";

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lot } = await supabase
    .from("lots")
    .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name, email, phone, city, is_valid))")
    .eq("id", id)
    .single();

  if (!lot) return notFound();

  const { data: references } = await supabase
    .from("lot_references")
    .select("*")
    .eq("lot_id", id)
    .order("created_at", { ascending: true });

  // Fetch or_investissement catalog for the form
  const { data: orInvestCatalog } = await supabase
    .from("or_investissement")
    .select("*")
    .order("designation", { ascending: true });

  const lotWithRefs: LotWithReferences & { dossier: typeof lot.dossier } = {
    ...lot,
    references: (references ?? []) as LotReference[],
  };

  return (
    <LotDetailPage
      lot={lotWithRefs}
      orInvestCatalog={orInvestCatalog ?? []}
    />
  );
}
