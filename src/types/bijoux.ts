export interface BijouxStock {
  id: string;
  nom: string;
  description: string | null;
  photo_url: string | null;
  statut: "en_stock" | "vendu" | "reserve" | "en_depot_vente" | "rendu_client" | "en_reparation" | "fondu" | "a_fondre";
  poids: number | null;
  quantite: number | null;
  titrage: string | null;
  metaux: "Or" | "Platine" | "Argent" | null;
  qualite: "333" | "375" | "585" | "750" | "999" | null;
  prix_achat: number | null;
  prix_revente: number | null;
  depot_vente_lot_id: string | null;
  deposant_client_id: string | null;
  date_creation: string;
  created_at: string;
  updated_at: string;
}

export interface Reparation {
  id: string;
  bijou_id: string;
  description: string | null;
  cout_estime: number | null;
  cout_reel: number | null;
  notes: string | null;
  date_envoi: string;
  date_retour: string | null;
  statut: "en_cours" | "terminee";
  created_at: string;
  updated_at: string;
}

export interface BijouxStockWithOrigin extends BijouxStock {
  origin_client_name: string | null;
  origin_type: "rachat" | "depot_vente" | null;
}

export interface StockOrigin {
  type: "rachat" | "depot_vente";
  reference?: {
    id: string;
    designation: string;
    prix_achat: number | null;
    status: string;
  };
  lot: {
    id: string;
    numero: string;
    type: string;
    status: string;
    date_finalisation: string | null;
    created_at: string;
  };
  dossier: {
    id: string;
    numero: string;
  };
  client: {
    id: string;
    civility: string;
    first_name: string;
    last_name: string;
  };
}

export interface StockSale {
  ligne: {
    id: string;
    prix_total: number | null;
    is_livre: boolean;
  };
  lot: {
    id: string;
    numero: string;
    status: string;
    date_livraison: string | null;
    created_at: string;
  };
  dossier: {
    id: string;
    numero: string;
  };
  client: {
    id: string;
    civility: string;
    first_name: string;
    last_name: string;
  };
}
