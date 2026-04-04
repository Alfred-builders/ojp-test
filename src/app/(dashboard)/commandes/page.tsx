import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { CommandePageClient } from "@/components/commandes/commande-page-client";
import type { LotWithDossier } from "@/types/lot";

export interface CommandeLigneFlat {
  id: string;
  lot_id: string;
  lot_numero: string;
  client_name: string;
  client_id: string;
  dossier_id: string;
  or_investissement_id: string;
  designation: string;
  metal: string | null;
  poids: number | null;
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
  fulfillment: string;
  stock_disponible: number;
}

export default async function CommandesPage() {
  const supabase = await createClient();

  // Fetch vente lots that have or_investissement lines with pending fulfillment
  const { data: pendingLignes } = await supabase
    .from("vente_lignes")
    .select("lot_id")
    .not("or_investissement_id", "is", null)
    .in("fulfillment", ["pending", "a_commander", "commande"]);

  const pendingLotIds = [...new Set((pendingLignes ?? []).map((l) => l.lot_id))];

  let lots: LotWithDossier[] = [];
  if (pendingLotIds.length > 0) {
    const { data } = await supabase
      .from("lots")
      .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name))")
      .in("id", pendingLotIds)
      .order("created_at", { ascending: false });

    lots = (data ?? []) as LotWithDossier[];
  }

  // Also fetch lots with status 'pret' or 'finalise' that are vente type
  const { data: pretLots } = await supabase
    .from("lots")
    .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name))")
    .eq("type", "vente")
    .in("status", ["pret", "finalise"])
    .order("created_at", { ascending: false });

  const allLots = [...lots, ...(pretLots ?? []).filter((l) => !lots.find((e) => e.id === l.id))] as LotWithDossier[];

  // Fetch all or_invest lignes for the flat view
  const allLotIds = allLots.map((l) => l.id);
  let flatLignes: CommandeLigneFlat[] = [];

  if (allLotIds.length > 0) {
    const { data: lignes } = await supabase
      .from("vente_lignes")
      .select("*")
      .in("lot_id", allLotIds)
      .not("or_investissement_id", "is", null)
      .order("created_at", { ascending: true });

    // Fetch stock for or_invest items
    const orIds = [...new Set((lignes ?? []).map((l) => l.or_investissement_id).filter(Boolean))];
    let stockMap: Record<string, number> = {};
    if (orIds.length > 0) {
      const { data: orItems } = await supabase
        .from("or_investissement")
        .select("id, quantite")
        .in("id", orIds);
      stockMap = Object.fromEntries((orItems ?? []).map((i) => [i.id, i.quantite]));
    }

    // Build flat list with client info from lots
    const lotMap = Object.fromEntries(allLots.map((l) => [l.id, l]));
    flatLignes = (lignes ?? []).map((l) => {
      const lot = lotMap[l.lot_id];
      const client = lot?.dossier?.client;
      const clientName = client
        ? `${client.civility === "M" ? "M." : "Mme"} ${client.first_name} ${client.last_name}`
        : "—";
      return {
        id: l.id,
        lot_id: l.lot_id,
        lot_numero: lot?.numero ?? "",
        client_name: clientName,
        client_id: client?.id ?? "",
        dossier_id: lot?.dossier?.id ?? "",
        or_investissement_id: l.or_investissement_id!,
        designation: l.designation,
        metal: l.metal,
        poids: l.poids,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
        prix_total: l.prix_total,
        fulfillment: l.fulfillment ?? "pending",
        stock_disponible: stockMap[l.or_investissement_id!] ?? 0,
      };
    });
  }

  return (
    <PageWrapper title="Commandes" fullHeight>
      <CommandePageClient lots={allLots} lignes={flatLignes} />
    </PageWrapper>
  );
}
