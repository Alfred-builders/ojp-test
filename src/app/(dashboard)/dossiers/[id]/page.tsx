import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getParametres } from "@/lib/parametres";
import { DossierDetailPage } from "@/components/dossiers/dossier-detail-page";
import type { DossierWithClient } from "@/types/dossier";
import type { Lot } from "@/types/lot";

export default async function DossierDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dossier } = await supabase
    .from("dossiers")
    .select("*, client:clients(id, civility, first_name, last_name, email, phone, city, is_valid)")
    .eq("id", id)
    .single();

  if (!dossier) notFound();

  const { data: lots } = await supabase
    .from("lots")
    .select("*")
    .eq("dossier_id", id)
    .order("created_at", { ascending: false });

  const parametres = await getParametres();

  return (
    <DossierDetailPage
      dossier={dossier as DossierWithClient}
      lots={(lots ?? []) as Lot[]}
      parametres={parametres}
    />
  );
}
