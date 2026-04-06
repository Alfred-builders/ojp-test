import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { OrInvestissementTable } from "@/components/or-investissement/or-investissement-table";
import type { OrInvestissement } from "@/types/or-investissement";
import type { UserRole } from "@/types/auth";

export default async function OrInvestissementPage({
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

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const role = (profile?.role ?? "vendeur") as UserRole;

  const { count } = await supabase
    .from("or_investissement")
    .select("*", { count: "exact", head: true });

  const { data } = await supabase
    .from("or_investissement")
    .select("*")
    .order("designation", { ascending: true })
    .range(from, to);

  const items = (data ?? []) as OrInvestissement[];

  return (
    <PageWrapper title="Or Investissement" fullHeight>
      <OrInvestissementTable data={items} canEdit={role === "proprietaire"} totalItems={count ?? 0} page={page} pageSize={size} />
    </PageWrapper>
  );
}
