import Link from "next/link";
import { UserPlus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { ClientTable } from "@/components/clients/client-table";
import { Button } from "@/components/ui/button";
import type { Client } from "@/types/client";

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

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
      <ClientTable data={clients} />
    </PageWrapper>
  );
}
