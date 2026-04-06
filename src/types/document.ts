export type DocumentType = "quittance_rachat" | "contrat_rachat" | "devis_rachat" | "contrat_depot_vente" | "confie_achat" | "quittance_depot_vente" | "facture_vente" | "facture_acompte" | "facture_solde" | "bon_commande" | "bon_livraison";

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  numero: string;
  lot_id: string;
  dossier_id: string;
  client_id: string;
  storage_path: string;
  reference_numero: string | null;
  created_at: string;
}
