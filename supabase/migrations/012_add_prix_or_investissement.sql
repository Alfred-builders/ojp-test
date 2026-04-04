-- Ajout des colonnes prix à or_investissement
ALTER TABLE public.or_investissement
  ADD COLUMN IF NOT EXISTS prix_achat NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS prix_revente NUMERIC(10,2);
