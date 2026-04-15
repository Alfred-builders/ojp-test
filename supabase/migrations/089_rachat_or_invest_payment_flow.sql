-- ============================================================
-- Rachat or investissement: add en_attente_paiement status
-- Refs stay in this status until the client is paid
-- ============================================================

ALTER TABLE public.lot_references DROP CONSTRAINT IF EXISTS lot_references_status_check;
ALTER TABLE public.lot_references ADD CONSTRAINT lot_references_status_check
  CHECK (status IN (
    'en_expertise', 'expertise_ok', 'bloque',
    'route_stock', 'route_fonderie', 'route_depot_vente', 'retracte',
    'en_depot_vente', 'vendu', 'rendu_client',
    'devis_envoye', 'devis_accepte', 'devis_refuse',
    'en_retractation', 'en_attente_paiement', 'finalise'
  ));
