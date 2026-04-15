import { createClient } from "@/lib/supabase/server";
import { ALL_WITH_DOSSIER_CLIENT } from "@/lib/supabase/queries";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { RoutagePageClient } from "@/components/fonderie/routage-page-client";
import type { LotWithDossier } from "@/types/lot";
import type { CommandeLigneFlat } from "@/types/commande";
import type { Fonderie } from "@/types/fonderie";

export default async function RoutagePage() {
  const supabase = await createClient();

  // Only fetch lines pending dispatch (not already dispatched)
  const { data: pendingLignes } = await supabase
    .from("vente_lignes")
    .select("lot_id")
    .not("or_investissement_id", "is", null)
    .in("fulfillment", ["pending", "a_commander"]);

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

  const allLotIds = lots.map((l) => l.id);
  let flatLignes: CommandeLigneFlat[] = [];

  if (allLotIds.length > 0) {
    const { data: lignes } = await supabase
      .from("vente_lignes")
      .select("*")
      .in("lot_id", allLotIds)
      .not("or_investissement_id", "is", null)
      .in("fulfillment", ["pending", "a_commander"])
      .order("created_at", { ascending: true });

    const orIds = [
      ...new Set(
        (lignes ?? []).map((l) => l.or_investissement_id).filter(Boolean),
      ),
    ];
    let stockMap: Record<string, number> = {};
    if (orIds.length > 0) {
      const { data: orItems } = await supabase
        .from("or_investissement")
        .select("id, quantite")
        .in("id", orIds);
      stockMap = Object.fromEntries(
        (orItems ?? []).map((i) => [i.id, i.quantite]),
      );
    }

    const lotMap = Object.fromEntries(lots.map((l) => [l.id, l]));
    flatLignes = (lignes ?? []).map((l) => {
      const lot = lotMap[l.lot_id];
      const client = lot?.dossier?.client;
      const clientName = client
        ? `${client.civility === "M" ? "M." : "Mme"} ${client.first_name} ${client.last_name}`
        : "\u2014";
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

  const { data: allFonderies } = await supabase.from("fonderies").select("*").order("nom");

  return (
    <PageWrapper title="Routage fonderie" fullHeight>
      <RoutagePageClient
        lignes={flatLignes}
        fonderies={(allFonderies ?? []) as Fonderie[]}
      />
    </PageWrapper>
  );
}
