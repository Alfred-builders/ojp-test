-- Add cout_reparation to vente_lignes
-- Stores the total repair cost included in the sale price for traceability
ALTER TABLE public.vente_lignes
  ADD COLUMN IF NOT EXISTS cout_reparation NUMERIC(10,2) DEFAULT 0;
