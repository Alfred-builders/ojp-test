export type LotType = "rachat" | "vente" | "depot_vente";

export type RachatStatus =
  | "brouillon"
  | "devis_envoye"
  | "accepte"
  | "refuse"
  | "en_retractation"
  | "finalise"
  | "retracte";

export type VenteStatus =
  | "brouillon"
  | "en_cours"
  | "livre"
  | "a_regler"
  | "termine"
  | "annule"
  | "pret";

export type LotStatus = RachatStatus | VenteStatus;

export type ReferenceCategorie = "bijoux" | "or_investissement";

export type ReferenceStatus =
  | "en_expertise"
  | "expertise_ok"
  | "bloque"
  | "route_stock"
  | "route_fonderie"
  | "route_depot_vente"
  | "retracte"
  | "en_depot_vente"
  | "vendu"
  | "rendu_client"
  | "devis_envoye"
  | "devis_accepte"
  | "devis_refuse"
  | "en_retractation"
  | "finalise";

export type ReferenceDestination = "stock_boutique" | "fonderie" | "depot_vente";

export type TypeRachat = "direct" | "devis";

export type RegimeFiscal = "TPV" | "TMP";

export interface Lot {
  id: string;
  numero: string;
  dossier_id: string;
  type: LotType;
  status: LotStatus;
  total_prix_achat: number;
  total_prix_revente: number;
  marge_brute: number;
  montant_taxe: number;
  montant_net: number;
  date_acceptation: string | null;
  date_fin_retractation: string | null;
  date_finalisation: string | null;
  cours_or_snapshot: number | null;
  cours_argent_snapshot: number | null;
  cours_platine_snapshot: number | null;
  coefficient_rachat_snapshot: number | null;
  coefficient_vente_snapshot: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Vente-specific fields
  date_livraison: string | null;
  date_reglement: string | null;
  mode_reglement: "especes" | "carte" | "virement" | "cheque" | null;
  numero_facture: string | null;
}

export interface LotReference {
  id: string;
  lot_id: string;
  categorie: ReferenceCategorie;
  designation: string;
  photo_url: string | null;
  metal: "Or" | "Argent" | "Platine" | null;
  qualite: "333" | "375" | "585" | "750" | "999" | null;
  poids: number | null;
  or_investissement_id: string | null;
  is_scelle: boolean;
  has_facture: boolean;
  date_acquisition: string | null;
  prix_acquisition: number | null;
  cours_metal_utilise: number | null;
  coefficient_utilise: number | null;
  prix_achat: number;
  prix_revente_estime: number | null;
  regime_fiscal: RegimeFiscal | null;
  montant_taxe: number;
  tpv_eligible: boolean;
  tpv_montant: number | null;
  tmp_montant: number | null;
  destination: ReferenceDestination | null;
  destination_stock_id: string | null;
  type_rachat: TypeRachat;
  status: ReferenceStatus;
  quantite: number;
  date_envoi: string | null;
  date_fin_delai: string | null;
  created_at: string;
  updated_at: string;
}

export interface LotWithReferences extends Lot {
  references: LotReference[];
}

export interface LotWithVenteLignes extends Lot {
  lignes: import("@/types/vente").VenteLigne[];
}

export interface LotWithDossier extends Lot {
  dossier: {
    id: string;
    numero: string;
    client: {
      id: string;
      civility: string;
      first_name: string;
      last_name: string;
    };
  };
}
