import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VenteDetailPage } from "@/components/ventes/vente-detail-page";
import type { LotWithVenteLignes } from "@/types/lot";
import type { VenteLigne, Facture } from "@/types/vente";

export default async function VentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lot } = await supabase
    .from("lots")
    .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name, email, phone, city, is_valid))")
    .eq("id", id)
    .eq("type", "vente")
    .single();

  if (!lot) return notFound();

  const { data: lignes } = await supabase
    .from("vente_lignes")
    .select("*")
    .eq("lot_id", id)
    .order("created_at", { ascending: true });

  const { data: facture } = await supabase
    .from("factures")
    .select("*")
    .eq("lot_id", id)
    .maybeSingle();

  const lotWithLignes: LotWithVenteLignes & { dossier: typeof lot.dossier } = {
    ...lot,
    lignes: (lignes ?? []) as VenteLigne[],
  };

  return (
    <VenteDetailPage
      lot={lotWithLignes}
      facture={(facture as Facture) ?? null}
    />
  );
}
