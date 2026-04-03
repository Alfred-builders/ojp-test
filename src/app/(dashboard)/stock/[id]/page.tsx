import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StockDetailPage } from "@/components/stock/stock-detail-page";
import type { BijouxStock } from "@/types/bijoux";

export default async function StockDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("bijoux_stock")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();

  return <StockDetailPage bijou={data as BijouxStock} />;
}
