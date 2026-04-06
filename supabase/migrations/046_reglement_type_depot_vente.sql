-- Add 'depot_vente' to the reglement type check constraint
-- This allows tracking payments to deposants when their items are sold

ALTER TABLE public.reglements
  DROP CONSTRAINT IF EXISTS reglements_type_check;

ALTER TABLE public.reglements
  ADD CONSTRAINT reglements_type_check
  CHECK (type IN ('rachat','vente','acompte','solde','fonderie','depot_vente'));
