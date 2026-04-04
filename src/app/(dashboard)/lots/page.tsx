import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { LotTable } from "@/components/lots/lot-table";
import type { LotWithDossier } from "@/types/lot";

export default async function LotsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("lots")
    .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name))")
    .eq("type", "rachat")
    .order("created_at", { ascending: false });

  const lots = (data ?? []) as LotWithDossier[];

  return (
    <PageWrapper title="Rachat" fullHeight>
      <LotTable data={lots} />
    </PageWrapper>
  );
}
