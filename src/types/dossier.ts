export type DossierStatus = "brouillon" | "en_cours" | "finalise";

export interface Dossier {
  id: string;
  numero: string;
  client_id: string;
  status: DossierStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DossierClient {
  id: string;
  civility: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  is_valid: boolean;
}

export interface DossierWithClient extends Dossier {
  client: DossierClient;
}
