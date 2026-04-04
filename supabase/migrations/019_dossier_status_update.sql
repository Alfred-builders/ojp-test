-- ============================================================
-- Dossier: update status from ouvert/ferme to brouillon/en_cours/finalise
-- ============================================================

-- First drop old constraint to allow new values
ALTER TABLE public.dossiers DROP CONSTRAINT IF EXISTS dossiers_status_check;

-- Update existing data
UPDATE public.dossiers SET status = 'brouillon' WHERE status = 'ouvert';
UPDATE public.dossiers SET status = 'finalise' WHERE status = 'ferme';

-- Add new constraint
ALTER TABLE public.dossiers ADD CONSTRAINT dossiers_status_check
  CHECK (status IN ('brouillon', 'en_cours', 'finalise'));

-- Update default
ALTER TABLE public.dossiers ALTER COLUMN status SET DEFAULT 'brouillon';
