import { createClient } from "@/lib/supabase/server";
import { LOT_REF_WITH_TAX_DATA, FACTURE_WITH_TAX_DATA } from "@/lib/supabase/queries";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { ImpotsTable } from "@/components/impots/impots-table";
import type { TaxeRow } from "@/types/impots";

export default async function ImpotsPage() {
  const supabase = await createClient();

  // Fetch rachat taxes (lot_references with regime_fiscal set, from finalized lots)
  const { data: refData } = await supabase
    .from("lot_references")
    .select(LOT_REF_WITH_TAX_DATA)
    .not("regime_fiscal", "is", null)
    .gt("montant_taxe", 0);

  // Fetch vente taxes (factures with TVA)
  const { data: factureData } = await supabase
    .from("factures")
    .select(FACTURE_WITH_TAX_DATA)
    .gt("montant_taxe", 0);

  // Transform rachat references into unified TaxeRow
  const rachatRows: TaxeRow[] = (refData ?? [])
    .filter((ref: any) => ref.lot?.status !== "brouillon" && ref.lot?.dossier?.client)
    .map((ref: any) => {
      const client = ref.lot.dossier.client;
      const civility = client.civility === "M" ? "M." : "Mme";
      return {
        id: `ref-${ref.id}`,
        date: ref.lot.date_finalisation ?? ref.created_at,
        reference: ref.lot.numero,
        client_name: `${civility} ${client.first_name} ${client.last_name}`,
        type: ref.regime_fiscal as "TMP" | "TPV" | "TFOP",
        montant_brut: ref.prix_achat,
        montant_taxe: ref.montant_taxe,
        source_type: "rachat" as const,
        source_id: ref.lot.id,
      };
    });

  // Transform factures into unified TaxeRow
  const venteRows: TaxeRow[] = (factureData ?? [])
    .filter((f: any) => f.lot?.dossier?.client)
    .map((f: any) => {
      const client = f.lot.dossier.client;
      const civility = client.civility === "M" ? "M." : "Mme";
      return {
        id: `fac-${f.id}`,
        date: f.date_emission,
        reference: f.numero,
        client_name: `${civility} ${client.first_name} ${client.last_name}`,
        type: "TVA" as const,
        montant_brut: f.montant_ht,
        montant_taxe: f.montant_taxe,
        source_type: "vente" as const,
        source_id: f.lot.id,
      };
    });

  // Merge and sort by date descending
  const allTaxes = [...rachatRows, ...venteRows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <PageWrapper title="Impôts" fullHeight>
      <ImpotsTable data={allTaxes} />
    </PageWrapper>
  );
}
