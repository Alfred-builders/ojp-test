import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { FonderiesTable } from "@/components/fonderies/fonderies-table";
import type { Fonderie } from "@/types/fonderie";

export default async function FonderiesPage({
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
    .from("fonderies")
    .select("*", { count: "exact", head: true });

  const { data } = await supabase
    .from("fonderies")
    .select("*")
    .order("nom", { ascending: true })
    .range(from, to);

  return (
    <PageWrapper title="Fonderies" fullHeight>
      <FonderiesTable fonderies={(data ?? []) as Fonderie[]} totalItems={count ?? 0} page={page} pageSize={size} />
    </PageWrapper>
  );
}
