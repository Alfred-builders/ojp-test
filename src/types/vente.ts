export type VenteStatus = "brouillon" | "en_cours" | "livre" | "a_regler" | "termine" | "annule" | "pret" | "finalise";

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
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
  taxe_applicable: boolean;
  montant_taxe: number;
  fulfillment: FulfillmentStatus;
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
