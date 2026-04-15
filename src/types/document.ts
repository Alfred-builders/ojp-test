export type DocumentType = "quittance_rachat" | "contrat_rachat" | "devis_rachat" | "contrat_depot_vente" | "confie_achat" | "quittance_depot_vente" | "facture_vente" | "facture_acompte" | "facture_solde" | "bon_commande" | "bon_livraison";

export type DocumentStatus = "en_attente" | "accepte" | "refuse" | "signe" | "regle" | "emis" | "annule";

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  numero: string;
  lot_id: string;
  dossier_id: string;
  client_id: string;
  storage_path: string;
  status: DocumentStatus;
  reference_numero: string | null;
  created_at: string;
}

export interface DocumentReference {
  id: string;
  document_id: string;
  lot_reference_id: string;
}

export interface DocumentWithRefs extends DocumentRecord {
  document_references: DocumentReference[];
}
