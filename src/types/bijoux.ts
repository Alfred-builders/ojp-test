export interface BijouxStock {
  id: string;
  nom: string;
  description: string | null;
  photo_url: string | null;
  statut: "en_stock" | "vendu" | "reserve";
  poids: number | null;
  quantite: number | null;
  titrage: string | null;
  metaux: "Or" | "Platine" | "Argent" | null;
  qualite: "333" | "375" | "585" | "750" | "999" | null;
  prix_achat: number | null;
  prix_revente: number | null;
  date_creation: string;
  created_at: string;
  updated_at: string;
}
