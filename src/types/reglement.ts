export type ReglementSens = "entrant" | "sortant";
export type ReglementType = "rachat" | "vente" | "acompte" | "solde" | "fonderie" | "depot_vente";
export type ModeReglement = "especes" | "carte" | "virement" | "cheque";

export interface Reglement {
  id: string;
  lot_id: string;
  bon_commande_id: string | null;
  document_id: string | null;
  sens: ReglementSens;
  type: ReglementType;
  montant: number;
  mode: ModeReglement;
  date_reglement: string;
  client_id: string | null;
  fonderie_id: string | null;
  notes: string | null;
  created_at: string;
}
