import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommandeDetailPage } from "@/components/commandes/commande-detail-page";
import type { LotWithVenteLignes } from "@/types/lot";
import type { VenteLigne } from "@/types/vente";

export default async function CommandeDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lot } = await supabase
    .from("lots")
    .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name, email, phone))")
    .eq("id", id)
    .single();

  if (!lot || lot.type !== "vente") return notFound();

  const { data: lignes } = await supabase
    .from("vente_lignes")
    .select("*")
    .eq("lot_id", id)
    .order("created_at", { ascending: true });

  // Fetch or_investissement catalog for stock info
  const orInvestIds = (lignes ?? [])
    .filter((l) => l.or_investissement_id)
    .map((l) => l.or_investissement_id!);

  let orInvestStock: Record<string, number> = {};
  if (orInvestIds.length > 0) {
    const { data: orItems } = await supabase
      .from("or_investissement")
      .select("id, quantite")
      .in("id", orInvestIds);

    orInvestStock = Object.fromEntries(
      (orItems ?? []).map((item) => [item.id, item.quantite])
    );
  }

  const lotWithLignes: LotWithVenteLignes & { dossier: typeof lot.dossier } = {
    ...lot,
    lignes: (lignes ?? []) as VenteLigne[],
  };

  return (
    <CommandeDetailPage
      lot={lotWithLignes}
      orInvestStock={orInvestStock}
    />
  );
}
