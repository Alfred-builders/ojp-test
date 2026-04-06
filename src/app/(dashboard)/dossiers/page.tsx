import Link from "next/link";
import { FolderPlus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { DossierTable } from "@/components/dossiers/dossier-table";
import { Button } from "@/components/ui/button";
import type { DossierWithClient } from "@/types/dossier";

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

  const { count } = await supabase
    .from("dossiers")
    .select("*", { count: "exact", head: true });

  const { data } = await supabase
    .from("dossiers")
    .select("*, client:clients(id, civility, first_name, last_name, is_valid)")
    .order("created_at", { ascending: false })
    .range(from, to);

  const dossiers = (data ?? []) as DossierWithClient[];

  return (
    <PageWrapper
      title="Dossiers"
      fullHeight
      headerActions={
        <Link href="/dossiers/new">
          <Button size="sm">
            <FolderPlus size={16} weight="duotone" />
            Nouveau dossier
          </Button>
        </Link>
      }
    >
      <DossierTable data={dossiers} totalItems={count ?? 0} page={page} pageSize={size} />
    </PageWrapper>
  );
}
