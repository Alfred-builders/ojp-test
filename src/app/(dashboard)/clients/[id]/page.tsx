import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientDetailPage } from "@/components/clients/client-detail-page";
import type { Client, ClientIdentityDocument } from "@/types/client";
import type { Dossier } from "@/types/dossier";

export default async function ClientDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const { data: documents } = await supabase
    .from("client_identity_documents")
    .select("*")
    .eq("client_id", id)
    .order("is_primary", { ascending: false });

  const { data: dossiers } = await supabase
    .from("dossiers")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <ClientDetailPage
      client={client as Client}
      identityDocuments={(documents ?? []) as ClientIdentityDocument[]}
      dossiers={(dossiers ?? []) as Dossier[]}
    />
  );
}
