-- ============================================================
-- Migration 084: Autoriser brouillon → finalise pour les dossiers
-- Quand tous les lots sont finalisés immédiatement (ex: dépôt-vente)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_dossier_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'brouillon' AND NEW.status IN ('en_cours', 'finalise'))
    OR (OLD.status = 'en_cours' AND NEW.status IN ('finalise'))
  ) THEN
    RAISE EXCEPTION 'Transition de statut invalide pour dossier: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
