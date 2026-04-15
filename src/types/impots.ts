export type TaxeType = "TMP" | "TPV" | "TFOP" | "TVA";

export interface TaxeRow {
  id: string;
  date: string;
  reference: string;
  client_name: string;
  type: TaxeType;
  montant_brut: number;
  montant_taxe: number;
  source_type: "rachat" | "vente";
  source_id: string;
}
