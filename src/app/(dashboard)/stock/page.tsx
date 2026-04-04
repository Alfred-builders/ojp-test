import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { StockTable } from "@/components/stock/stock-table";
import type { BijouxStock } from "@/types/bijoux";

export default async function StockPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("bijoux_stock")
    .select("*")
    .order("date_creation", { ascending: false });

  const bijoux = (data ?? []) as BijouxStock[];

  return (
    <PageWrapper title="Stock" fullHeight>
      <StockTable data={bijoux} />
    </PageWrapper>
  );
}
