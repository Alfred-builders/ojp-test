-- ============================================================
-- Migration 077: Corriger le trigger update_client_validity
-- Le trigger échouait silencieusement car il n'avait pas
-- SECURITY DEFINER pour bypasser les politiques RLS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_client_validity()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Déterminer le client_id concerné
  IF TG_OP = 'DELETE' THEN
    v_client_id := OLD.client_id;
  ELSE
    v_client_id := NEW.client_id;
  END IF;

  -- Recalculer la validité
  UPDATE public.clients
  SET is_valid = public.is_client_valid(v_client_id)
  WHERE id = v_client_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
