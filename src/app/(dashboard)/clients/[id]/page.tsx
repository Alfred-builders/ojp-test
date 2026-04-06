import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientDetailPage } from "@/components/clients/client-detail-page";
import type { Client, ClientIdentityDocument } from "@/types/client";
import type { Dossier } from "@/types/dossier";
import type { DocumentRecord } from "@/types/document";

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

  if (!client) return notFound();

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

  const { data: pdfDocuments } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <ClientDetailPage
      client={client as Client}
      identityDocuments={(documents ?? []) as ClientIdentityDocument[]}
      dossiers={(dossiers ?? []) as Dossier[]}
      pdfDocuments={(pdfDocuments ?? []) as DocumentRecord[]}
    />
  );
}
