-- ============================================================
-- Depot-vente: extend lot_references status for consignment
-- ============================================================

-- Add new reference statuses: en_depot_vente, vendu, rendu_client
ALTER TABLE public.lot_references DROP CONSTRAINT IF EXISTS lot_references_status_check;
ALTER TABLE public.lot_references ADD CONSTRAINT lot_references_status_check
  CHECK (status IN (
    'en_expertise',
    'expertise_ok',
    'bloque',
    'route_stock',
    'route_fonderie',
    'route_depot_vente',
    'retracte',
    'en_depot_vente',
    'vendu',
    'rendu_client'
  ));
