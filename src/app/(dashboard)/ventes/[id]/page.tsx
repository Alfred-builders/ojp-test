import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VenteDetailPage } from "@/components/ventes/vente-detail-page";
import type { LotWithVenteLignes } from "@/types/lot";
import type { VenteLigne, Facture } from "@/types/vente";
import type { Fonderie } from "@/types/fonderie";
import type { Reglement } from "@/types/reglement";
import type { BonCommande } from "@/types/bon-commande";

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

  const [lignesRes, factureRes, fonderiesRes, reglementsRes, documentsRes] = await Promise.all([
    supabase
      .from("vente_lignes")
      .select("*")
      .eq("lot_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("factures")
      .select("*")
      .eq("lot_id", id)
      .maybeSingle(),
    supabase
      .from("fonderies")
      .select("*")
      .order("nom"),
    supabase
      .from("reglements")
      .select("*")
      .eq("lot_id", id)
      .order("date_reglement", { ascending: true }),
    supabase
      .from("documents")
      .select("*")
      .eq("lot_id", id)
      .order("created_at", { ascending: true }),
  ]);

  // Fetch bons de commande for fonderie lines on this lot
  const lignesData = (lignesRes.data ?? []) as VenteLigne[];
  const bdcIds = [...new Set(lignesData.filter((l) => l.bon_commande_id).map((l) => l.bon_commande_id!))];
  let bonsCommande: BonCommande[] = [];
  if (bdcIds.length > 0) {
    const { data: bdcData } = await supabase
      .from("bons_commande")
      .select("*, fonderie:fonderies(*)")
      .in("id", bdcIds);
    bonsCommande = (bdcData ?? []) as BonCommande[];
  }

  const lignes = lignesData;

  // Fetch or_investissement stock for fulfillment buttons
  const orInvestIds = [...new Set(lignes
    .filter((l) => l.or_investissement_id)
    .map((l) => l.or_investissement_id!))];

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
    lignes,
  };

  const fonderies = (fonderiesRes.data ?? []) as Fonderie[];

  return (
    <VenteDetailPage
      lot={lotWithLignes}
      facture={(factureRes.data as Facture) ?? null}
      orInvestStock={orInvestStock}
      fonderies={fonderies}
      reglements={(reglementsRes.data ?? []) as Reglement[]}
      bonsCommande={bonsCommande}
      documents={documentsRes.data ?? []}
    />
  );
}
