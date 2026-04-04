-- ============================================================
-- Vente or investissement: add or_invest link + fulfillment + pret status
-- ============================================================

-- Add or_investissement_id on vente_lignes (nullable, for or invest sales)
ALTER TABLE public.vente_lignes
  ADD COLUMN IF NOT EXISTS or_investissement_id UUID REFERENCES public.or_investissement(id);

-- Add fulfillment status per line (for or invest fulfillment tracking)
ALTER TABLE public.vente_lignes
  ADD COLUMN IF NOT EXISTS fulfillment TEXT DEFAULT 'pending'
  CHECK (fulfillment IN ('pending', 'servi_stock', 'a_commander', 'commande', 'recu'));

-- Add 'pret' status for vente lots (order ready for pickup)
ALTER TABLE public.lots DROP CONSTRAINT IF EXISTS lots_status_check;
ALTER TABLE public.lots ADD CONSTRAINT lots_status_check CHECK (status IN (
  'brouillon', 'devis_envoye', 'accepte', 'refuse', 'en_retractation', 'finalise', 'retracte',
  'en_cours', 'livre', 'a_regler', 'termine', 'annule', 'pret'
));
