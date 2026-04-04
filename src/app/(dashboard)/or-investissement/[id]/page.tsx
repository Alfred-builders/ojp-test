import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrInvestissementDetailPage } from "@/components/or-investissement/or-investissement-detail-page";
import type { OrInvestissement } from "@/types/or-investissement";

export default async function OrInvestissementDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("or_investissement")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();

  return <OrInvestissementDetailPage item={data as OrInvestissement} />;
}
