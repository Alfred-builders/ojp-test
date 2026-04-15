-- ============================================================
-- Migration 081: Simplifier les statuts de lots
-- 3 statuts : brouillon, en_cours, finalise
-- + champ outcome pour tracer comment le lot s'est terminé
-- ============================================================

-- 1. Ajouter la colonne outcome
ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS outcome TEXT
  CONSTRAINT lots_outcome_check CHECK (outcome IN ('complete', 'refuse', 'retracte', 'annule'));

-- 2. Migrer les données existantes
-- Lots finalisés → outcome complete
UPDATE public.lots SET outcome = 'complete' WHERE status = 'finalise';
-- Lots refusés → finalise + outcome refuse
UPDATE public.lots SET outcome = 'refuse', status = 'finalise' WHERE status = 'refuse';
-- Lots rétractés → finalise + outcome retracte
UPDATE public.lots SET outcome = 'retracte', status = 'finalise' WHERE status = 'retracte';
-- Lots terminés (vente) → finalise + outcome complete
UPDATE public.lots SET outcome = 'complete', status = 'finalise' WHERE status = 'termine';
-- Lots annulés (vente) → finalise + outcome annule
UPDATE public.lots SET outcome = 'annule', status = 'finalise' WHERE status = 'annule';
-- Lots en cours de process détaillé → en_cours
UPDATE public.lots SET status = 'en_cours' WHERE status IN ('devis_envoye', 'accepte', 'en_retractation');

-- 3. Simplifier le CHECK constraint
ALTER TABLE public.lots DROP CONSTRAINT IF EXISTS lots_status_check;
ALTER TABLE public.lots ADD CONSTRAINT lots_status_check
  CHECK (status IN ('brouillon', 'en_cours', 'finalise'));

-- 4. Simplifier le trigger de transitions
CREATE OR REPLACE FUNCTION public.validate_lot_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'brouillon' AND NEW.status IN ('en_cours', 'finalise'))
    OR (OLD.status = 'en_cours' AND NEW.status IN ('finalise'))
  ) THEN
    RAISE EXCEPTION 'Transition de statut invalide: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
