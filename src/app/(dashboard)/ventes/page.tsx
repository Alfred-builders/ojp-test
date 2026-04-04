import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { VenteTable } from "@/components/ventes/vente-table";
import type { LotWithDossier } from "@/types/lot";

export default async function VentesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("lots")
    .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name))")
    .eq("type", "vente")
    .order("created_at", { ascending: false });

  const ventes = (data ?? []) as LotWithDossier[];

  return (
    <PageWrapper title="Ventes" fullHeight>
      <VenteTable data={ventes} />
    </PageWrapper>
  );
}
