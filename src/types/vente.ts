export type FulfillmentStatus = "pending" | "servi_stock" | "a_commander" | "commande" | "recu";

export type ModeReglement = "especes" | "carte" | "virement" | "cheque";

export interface VenteLigne {
  id: string;
  lot_id: string;
  bijoux_stock_id: string | null;
  or_investissement_id: string | null;
  designation: string;
  metal: string | null;
  qualite: string | null;
  poids: number | null;
  poids_brut: number | null;
  poids_net: number | null;
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
  taxe_applicable: boolean;
  montant_taxe: number;
  type_taxe: "tva_marge" | "tfop" | null;
  fulfillment: FulfillmentStatus;
  fonderie_id: string | null;
  bon_commande_id: string | null;
  cout_reparation: number;
  is_livre: boolean;
  created_at: string;
  updated_at: string;
}

export interface Facture {
  id: string;
  numero: string;
  lot_id: string;
  client_id: string;
  montant_ht: number;
  montant_taxe: number;
  montant_ttc: number;
  date_emission: string;
  created_at: string;
}
