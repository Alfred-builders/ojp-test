export type FonderieLotType = "commande" | "fonte";

export interface FonderieLotRow {
  id: string;
  numero: string;
  type: FonderieLotType;
  fonderie_id: string;
  fonderie_nom: string;
  statut: string;
  montant: number;
  nb_lignes: number;
  date_creation: string;
  date_envoi: string | null;
  date_reception: string | null;
}
