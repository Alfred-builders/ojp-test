import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { SuiviTable } from "@/components/fonderie/suivi-table";
import type { BonCommande } from "@/types/bon-commande";
import type { BonLivraison } from "@/types/bon-livraison";
import type { FonderieLotRow } from "@/types/fonderie-lot";

export default async function SuiviPage() {
  const supabase = await createClient();

  const [{ data: bdcData }, { data: bdlData }] = await Promise.all([
    supabase
      .from("bons_commande")
      .select("*, fonderie:fonderies(*), lignes:vente_lignes(id)")
      .order("created_at", { ascending: false }),
    supabase
      .from("bons_livraison")
      .select("*, fonderie:fonderies(*), lignes:bon_livraison_lignes(id)")
      .order("created_at", { ascending: false }),
  ]);

  const bdcList = (bdcData ?? []) as (BonCommande & { lignes: { id: string }[] })[];
  const bdlList = (bdlData ?? []) as (BonLivraison & { lignes: { id: string }[] })[];

  // Normalize to unified rows
  const rows: FonderieLotRow[] = [
    ...bdcList.map((bdc) => ({
      id: bdc.id,
      numero: bdc.numero,
      type: "commande" as const,
      fonderie_id: bdc.fonderie_id,
      fonderie_nom: bdc.fonderie?.nom ?? "Fonderie",
      statut: bdc.statut,
      montant: bdc.montant_total,
      nb_lignes: bdc.lignes?.length ?? 0,
      date_creation: bdc.created_at,
      date_envoi: bdc.date_envoi,
      date_reception: bdc.date_reception,
    })),
    ...bdlList.map((bdl) => ({
      id: bdl.id,
      numero: bdl.numero,
      type: "fonte" as const,
      fonderie_id: bdl.fonderie_id,
      fonderie_nom: bdl.fonderie?.nom ?? "Fonderie",
      statut: bdl.statut,
      montant: bdl.valeur_estimee,
      nb_lignes: bdl.lignes?.length ?? 0,
      date_creation: bdl.created_at,
      date_envoi: bdl.date_envoi,
      date_reception: bdl.date_reception,
    })),
  ];

  // Sort by date desc
  rows.sort(
    (a, b) =>
      new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime(),
  );

  // Unique fonderie names for filter
  const fonderies = [...new Set(rows.map((r) => r.fonderie_nom))].sort();

  return (
    <PageWrapper title="Suivi fonderie" fullHeight>
      <SuiviTable data={rows} fonderies={fonderies} />
    </PageWrapper>
  );
}
