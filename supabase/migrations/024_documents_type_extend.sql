-- Extend documents type check to include depot-vente document types
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_type_check
  CHECK (type IN ('quittance_rachat', 'contrat_rachat', 'devis_rachat', 'contrat_depot_vente', 'confie_achat'));
