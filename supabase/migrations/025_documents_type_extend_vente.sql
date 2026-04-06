-- Extend documents type check to include quittance depot-vente and facture vente
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    'quittance_rachat', 'contrat_rachat', 'devis_rachat',
    'contrat_depot_vente', 'confie_achat',
    'quittance_depot_vente', 'facture_vente'
  ));
