-- Add facture_solde document type
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_type_check
  CHECK (type IN ('quittance_rachat','contrat_rachat','devis_rachat','contrat_depot_vente','confie_achat','quittance_depot_vente','facture_vente','facture_acompte','bon_commande','facture_solde'));

-- Add reference_numero to link related documents (e.g. acompte + solde)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS reference_numero TEXT;
