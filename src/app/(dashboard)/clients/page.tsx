import Link from "next/link";
import { UserPlus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { ClientTable } from "@/components/clients/client-table";
import { Button } from "@/components/ui/button";
import type { Client } from "@/types/client";

export default async function ClientsPage({
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
    .from("clients")
    .select("*", { count: "exact", head: true });

  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  const clients = (data ?? []) as Client[];

  return (
    <PageWrapper
      title="Clients"
      fullHeight
      headerActions={
        <Link href="/clients/new">
          <Button size="sm">
            <UserPlus size={16} weight="duotone" />
            Nouveau client
          </Button>
        </Link>
      }
    >
      <ClientTable data={clients} totalItems={count ?? 0} page={page} pageSize={size} />
    </PageWrapper>
  );
}
