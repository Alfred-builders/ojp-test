import type { Fonderie } from "./fonderie";
import type { BijouxStock } from "./bijoux";

export type BonLivraisonStatus = "brouillon" | "envoye" | "recu" | "traite" | "annule";

export interface BonLivraisonLigne {
  id: string;
  bon_livraison_id: string;
  bijoux_stock_id: string;
  designation: string;
  metal: string | null;
  titrage_declare: string | null;
  poids_declare: number | null;
  cours_utilise: number | null;
  valeur_estimee: number | null;
  titrage_reel: string | null;
  poids_reel: number | null;
  valeur_reelle: number | null;
  ecart_titrage: boolean;
  ecart_poids: boolean;
  ecart_notes: string | null;
  date_test: string | null;
  created_at: string;
  // Joins
  stock_item?: BijouxStock;
}

export interface BonLivraison {
  id: string;
  numero: string;
  fonderie_id: string;
  statut: BonLivraisonStatus;
  poids_total: number;
  valeur_estimee: number;
  date_envoi: string | null;
  date_reception: string | null;
  date_traitement: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  fonderie?: Fonderie;
  lignes?: BonLivraisonLigne[];
}
