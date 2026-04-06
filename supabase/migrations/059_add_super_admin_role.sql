-- ============================================================
-- Add super_admin role
-- Same rights as proprietaire + can change proprietaire roles
-- ============================================================

-- Update role CHECK constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'proprietaire', 'vendeur'));

-- Update protect_role_fields trigger to allow super_admin to change roles
CREATE OR REPLACE FUNCTION public.protect_role_fields()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Allow if role/status not changing
  IF OLD.role = NEW.role AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get caller role
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  -- Users cannot modify their own role
  IF auth.uid() = NEW.id AND OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Vous ne pouvez pas modifier votre propre rôle';
  END IF;

  -- super_admin can change any role (including proprietaire)
  IF caller_role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- proprietaire can change vendeur roles and status, but not other proprietaire/super_admin
  IF caller_role = 'proprietaire' THEN
    IF OLD.role IN ('super_admin', 'proprietaire') AND OLD.role != NEW.role THEN
      RAISE EXCEPTION 'Seul un super admin peut modifier le rôle d''un propriétaire';
    END IF;
    RETURN NEW;
  END IF;

  -- vendeur cannot change roles at all
  RAISE EXCEPTION 'Accès refusé';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
