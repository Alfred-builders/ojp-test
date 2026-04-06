import { createClient } from "@/lib/supabase/server";
import { ALL_WITH_DOSSIER_CLIENT } from "@/lib/supabase/queries";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { CommandePageClient } from "@/components/commandes/commande-page-client";
import type { LotWithDossier } from "@/types/lot";
import type { BonCommande } from "@/types/bon-commande";
import type { Reglement } from "@/types/reglement";
import type { VenteLigne } from "@/types/vente";
import type { CommandeLigneFlat } from "@/types/commande";
import type { BonLivraison } from "@/types/bon-livraison";

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
      .select(ALL_WITH_DOSSIER_CLIENT)
      .in("id", pendingLotIds)
      .neq("status", "brouillon")
      .order("created_at", { ascending: false });

    lots = (data ?? []) as LotWithDossier[];
  }

  // Also fetch terminated vente lots
  const { data: pretLots } = await supabase
    .from("lots")
    .select(ALL_WITH_DOSSIER_CLIENT)
    .eq("type", "vente")
    .eq("status", "termine")
    .order("created_at", { ascending: false });

  const lotIds = new Set(lots.map((l) => l.id));
  const allLots = [...lots, ...(pretLots ?? []).filter((l) => !lotIds.has(l.id))] as LotWithDossier[];

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
        fonderie_id: l.fonderie_id ?? null,
        stock_disponible: stockMap[l.or_investissement_id!] ?? 0,
      };
    });
  }

  // Parallel fetch: bons de commande, reglements, ungrouped lignes, fonderies, bons de livraison
  const [
    { data: bdcData },
    { data: fonderieReglements },
    { data: ungroupedLignes },
    { data: allFonderies },
    { data: bdlData },
  ] = await Promise.all([
    supabase.from("bons_commande").select("*, fonderie:fonderies(*)").order("created_at", { ascending: false }),
    supabase.from("reglements").select("*").eq("type", "fonderie").order("date_reglement", { ascending: true }),
    supabase.from("vente_lignes").select("*").eq("fulfillment", "commande").not("fonderie_id", "is", null).is("bon_commande_id", null),
    supabase.from("fonderies").select("*").order("nom"),
    supabase.from("bons_livraison").select("*, fonderie:fonderies(*), lignes:bon_livraison_lignes(*)").order("created_at", { ascending: false }),
  ]);

  const bdcList = (bdcData ?? []) as BonCommande[];

  // Batch fetch lignes for all BDCs
  const bdcIds = bdcList.map((b) => b.id);
  if (bdcIds.length > 0) {
    const { data: bdcLignes } = await supabase
      .from("vente_lignes")
      .select("*")
      .in("bon_commande_id", bdcIds);

    for (const bdc of bdcList) {
      bdc.lignes = ((bdcLignes ?? []) as VenteLigne[]).filter((l) => l.bon_commande_id === bdc.id);
    }
  }

  const fonderieNameMap = Object.fromEntries((allFonderies ?? []).map((f) => [f.id, f.nom]));

  // Group ungrouped by fonderie
  const ungroupedByFonderie: Array<{
    fonderie_id: string;
    fonderie_nom: string;
    ligne_ids: string[];
    total: number;
    count: number;
  }> = [];

  const grouped = new Map<string, { ids: string[]; total: number }>();
  for (const l of (ungroupedLignes ?? [])) {
    if (!l.fonderie_id) continue;
    const existing = grouped.get(l.fonderie_id) ?? { ids: [], total: 0 };
    existing.ids.push(l.id);
    existing.total += l.prix_total;
    grouped.set(l.fonderie_id, existing);
  }
  for (const [fId, data] of grouped) {
    ungroupedByFonderie.push({
      fonderie_id: fId,
      fonderie_nom: fonderieNameMap[fId] ?? "Fonderie",
      ligne_ids: data.ids,
      total: data.total,
      count: data.ids.length,
    });
  }

  const bdlList = (bdlData ?? []) as BonLivraison[];

  return (
    <PageWrapper title="Flux fonderie" fullHeight>
      <CommandePageClient
        lots={allLots}
        lignes={flatLignes}
        bonsCommande={bdcList}
        bonsLivraison={bdlList}
        reglements={(fonderieReglements ?? []) as Reglement[]}
        ungroupedByFonderie={ungroupedByFonderie}
        fonderies={(allFonderies ?? []) as import("@/types/fonderie").Fonderie[]}
      />
    </PageWrapper>
  );
}
