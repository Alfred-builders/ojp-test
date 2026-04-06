-- ============================================================
-- Server-side validation of status transitions
-- Triggers BEFORE UPDATE that reject invalid transitions
-- ============================================================

-- 1. Lot status transitions
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
      (OLD.status = 'brouillon'         AND NEW.status IN ('devis_envoye', 'refuse'))
      OR (OLD.status = 'devis_envoye'   AND NEW.status IN ('accepte', 'refuse'))
      OR (OLD.status = 'accepte'        AND NEW.status IN ('en_retractation'))
      OR (OLD.status = 'en_retractation' AND NEW.status IN ('finalise', 'retracte'))
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

CREATE TRIGGER validate_lot_status_transition_trigger
  BEFORE UPDATE OF status ON public.lots
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lot_status_transition();

-- 2. Dossier status transitions
CREATE OR REPLACE FUNCTION public.validate_dossier_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'brouillon' AND NEW.status IN ('en_cours'))
    OR (OLD.status = 'en_cours' AND NEW.status IN ('finalise'))
  ) THEN
    RAISE EXCEPTION 'Transition de statut invalide pour dossier: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_dossier_status_transition_trigger
  BEFORE UPDATE OF status ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_dossier_status_transition();
