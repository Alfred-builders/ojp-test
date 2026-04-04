import { createClient } from "@/lib/supabase/server";
import { DossierCreatePage } from "@/components/dossiers/dossier-create-page";
import type { Client } from "@/types/client";

export default async function NewDossierPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("is_valid", true)
    .order("last_name", { ascending: true });

  const clients = (data ?? []) as Client[];

  return <DossierCreatePage validClients={clients} />;
}
