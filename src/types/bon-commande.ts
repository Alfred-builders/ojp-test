import type { Fonderie } from "./fonderie";
import type { VenteLigne } from "./vente";

export type BonCommandeStatus = "brouillon" | "envoye" | "recu" | "paye" | "annule";

export interface BonCommande {
  id: string;
  numero: string;
  fonderie_id: string;
  statut: BonCommandeStatus;
  montant_total: number;
  date_envoi: string | null;
  date_reception: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  fonderie?: Fonderie;
  lignes?: VenteLigne[];
}
