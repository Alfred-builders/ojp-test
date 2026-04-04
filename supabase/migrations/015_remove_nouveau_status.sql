-- Migrate existing 'nouveau' lots to 'brouillon'
UPDATE public.lots SET status = 'brouillon' WHERE status = 'nouveau';

-- Remove 'nouveau' from lots.status constraint (ventes use 'brouillon' like rachat)
ALTER TABLE public.lots DROP CONSTRAINT lots_status_check;
ALTER TABLE public.lots ADD CONSTRAINT lots_status_check CHECK (
  status IN (
    'brouillon', 'devis_envoye', 'accepte', 'refuse', 'en_retractation', 'finalise', 'retracte',
    'en_cours', 'livre', 'a_regler', 'termine', 'annule'
  )
);
