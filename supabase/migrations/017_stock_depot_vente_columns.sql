-- ============================================================
-- Stock: add depot-vente traceability columns + extend statuses
-- ============================================================

-- Extend bijoux_stock statut to include en_depot_vente and rendu_client
ALTER TABLE public.bijoux_stock DROP CONSTRAINT IF EXISTS bijoux_stock_statut_check;
ALTER TABLE public.bijoux_stock ADD CONSTRAINT bijoux_stock_statut_check
  CHECK (statut IN ('en_stock', 'vendu', 'reserve', 'en_depot_vente', 'rendu_client'));

-- Add traceability columns for depot-vente items
ALTER TABLE public.bijoux_stock
  ADD COLUMN IF NOT EXISTS depot_vente_lot_id UUID REFERENCES public.lots(id),
  ADD COLUMN IF NOT EXISTS deposant_client_id UUID REFERENCES public.clients(id);
