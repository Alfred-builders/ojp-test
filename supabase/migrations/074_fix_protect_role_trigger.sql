-- ============================================================
-- Migration 074: Corriger le trigger protect_role_fields
-- Le trigger bloquait les mises à jour via service role (admin)
-- car auth.uid() est NULL en contexte service role
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_role_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Autoriser les opérations admin/service role (auth.uid() est NULL)
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    -- Bloquer la modification de son propre rôle/statut
    ELSIF auth.uid() = OLD.id THEN
      NEW.role := OLD.role;
      NEW.status := OLD.status;
    -- Bloquer les non-propriétaires
    ELSIF public.user_role() != 'proprietaire' AND public.user_role() != 'super_admin' THEN
      NEW.role := OLD.role;
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
