import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { DossierTable } from "@/components/dossiers/dossier-table";
import { DossierCreateButton } from "@/components/dossiers/dossier-create-button";
import type { DossierWithClient } from "@/types/dossier";
import type { Client } from "@/types/client";

export default async function DossiersPage({
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

  const [{ count }, { data }, { data: clientsData }] = await Promise.all([
    supabase.from("dossiers").select("*", { count: "exact", head: true }),
    supabase
      .from("dossiers")
      .select("*, client:clients(id, civility, first_name, last_name, is_valid)")
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("clients")
      .select("*")
      .eq("is_valid", true)
      .order("last_name", { ascending: true }),
  ]);

  const dossiers = (data ?? []) as DossierWithClient[];
  const validClients = (clientsData ?? []) as Client[];

  return (
    <PageWrapper
      title="Dossiers"
      fullHeight
      headerActions={<DossierCreateButton validClients={validClients} />}
    >
      <DossierTable data={dossiers} totalItems={count ?? 0} page={page} pageSize={size} />
    </PageWrapper>
  );
}
