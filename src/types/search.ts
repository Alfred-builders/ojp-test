export interface SearchResult {
  entity_type:
    | "client"
    | "dossier"
    | "lot"
    | "vente"
    | "bijoux"
    | "or_investissement";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export const ENTITY_LABELS: Record<SearchResult["entity_type"], string> = {
  client: "Clients",
  dossier: "Dossiers",
  lot: "Rachat",
  vente: "Ventes",
  bijoux: "Bijoux",
  or_investissement: "Or Investissement",
};
