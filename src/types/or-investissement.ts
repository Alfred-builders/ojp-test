export interface OrInvestissement {
  id: string;
  designation: string;
  poids: number | null;
  metal: "Or" | "Argent" | "Autres" | null;
  titre: string | null;
  pays: string | null;
  annees: string | null;
  quantite: number;
  prix_achat: number | null;
  prix_revente: number | null;
  created_at: string;
  updated_at: string;
}
