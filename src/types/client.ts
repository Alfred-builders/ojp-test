export type Civility = "M" | "Mme";

export type LeadSource =
  | "Bouche à oreille"
  | "Google"
  | "Réseaux sociaux"
  | "Passage en boutique"
  | "Recommandation"
  | "Publicité"
  | "Autre";

export type DocumentType = "cni" | "passeport" | "titre_sejour" | "permis_conduire";

export interface Client {
  id: string;
  civility: Civility;
  first_name: string;
  last_name: string;
  maiden_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  lead_source: LeadSource | null;
  notes: string | null;
  created_by: string | null;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientIdentityDocument {
  id: string;
  client_id: string;
  document_type: DocumentType;
  document_number: string;
  issue_date: string | null;
  expiry_date: string | null;
  nationality: string | null;
  photo_url: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
