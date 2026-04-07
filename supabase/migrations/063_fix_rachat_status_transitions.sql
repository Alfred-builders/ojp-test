-- ============================================================
-- Fix: add missing status transitions for rachat/depot_vente lots
-- brouillon → en_cours (when lot has devis refs, goes to processing)
-- brouillon → finalise (when all refs are immediate/or_investissement)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_lot_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Rachat lots
  IF NEW.type = 'rachat' OR NEW.type = 'depot_vente' THEN
    IF NOT (
      (OLD.status = 'brouillon'         AND NEW.status IN ('devis_envoye', 'refuse', 'en_cours', 'finalise'))
      OR (OLD.status = 'devis_envoye'   AND NEW.status IN ('accepte', 'refuse'))
      OR (OLD.status = 'accepte'        AND NEW.status IN ('en_retractation'))
      OR (OLD.status = 'en_retractation' AND NEW.status IN ('finalise', 'retracte'))
      OR (OLD.status = 'en_cours'       AND NEW.status IN ('finalise'))
    ) THEN
      RAISE EXCEPTION 'Transition de statut invalide pour lot rachat: % → %', OLD.status, NEW.status;
    END IF;

  -- Vente lots
  ELSIF NEW.type = 'vente' THEN
    IF NOT (
      (OLD.status = 'brouillon' AND NEW.status IN ('en_cours'))
      OR (OLD.status = 'en_cours' AND NEW.status IN ('termine', 'annule'))
    ) THEN
      RAISE EXCEPTION 'Transition de statut invalide pour lot vente: % → %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
