import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { OrInvestissementTable } from "@/components/or-investissement/or-investissement-table";
import type { OrInvestissement } from "@/types/or-investissement";

export default async function OrInvestissementPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("or_investissement")
    .select("*")
    .order("designation", { ascending: true });

  const items = (data ?? []) as OrInvestissement[];

  return (
    <PageWrapper title="Or Investissement" fullHeight>
      <OrInvestissementTable data={items} />
    </PageWrapper>
  );
}
