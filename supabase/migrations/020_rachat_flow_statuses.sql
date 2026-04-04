-- ============================================================
-- Rachat flow: add intermediate statuses + timer fields on references
-- ============================================================

-- Extend reference statuses for rachat flow
ALTER TABLE public.lot_references DROP CONSTRAINT IF EXISTS lot_references_status_check;
ALTER TABLE public.lot_references ADD CONSTRAINT lot_references_status_check
  CHECK (status IN (
    'en_expertise', 'expertise_ok', 'bloque',
    'route_stock', 'route_fonderie', 'route_depot_vente', 'retracte',
    'en_depot_vente', 'vendu', 'rendu_client',
    'devis_envoye', 'devis_accepte', 'devis_refuse',
    'en_retractation', 'finalise'
  ));

-- Timer fields per reference
ALTER TABLE public.lot_references
  ADD COLUMN IF NOT EXISTS date_envoi TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_fin_delai TIMESTAMPTZ;
