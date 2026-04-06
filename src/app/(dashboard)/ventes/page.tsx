import { createClient } from "@/lib/supabase/server";
import { ALL_WITH_DOSSIER_CLIENT } from "@/lib/supabase/queries";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { VenteTable } from "@/components/ventes/vente-table";
import type { LotWithDossier } from "@/types/lot";

export default async function VentesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(0, parseInt(params.page ?? "0"));
  const size = Math.max(1, parseInt(params.size ?? "20"));
  const from = page * size;
  const to = from + size - 1;

  const supabase = await createClient();

  const { count } = await supabase
    .from("lots")
    .select("*", { count: "exact", head: true })
    .eq("type", "vente");

  const { data } = await supabase
    .from("lots")
    .select(ALL_WITH_DOSSIER_CLIENT)
    .eq("type", "vente")
    .order("created_at", { ascending: false })
    .range(from, to);

  const ventes = (data ?? []) as LotWithDossier[];

  return (
    <PageWrapper title="Ventes" fullHeight>
      <VenteTable data={ventes} totalItems={count ?? 0} page={page} pageSize={size} />
    </PageWrapper>
  );
}
