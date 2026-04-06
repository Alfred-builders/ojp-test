-- ============================================================
-- Migration 042: Remplacer is_active (boolean) par status (text)
-- 3 statuts : pending (invite envoyee), active, inactive
-- ============================================================

-- 1. Ajouter la colonne status
ALTER TABLE public.profiles
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CONSTRAINT profiles_status_check CHECK (status IN ('pending', 'active', 'inactive'));

-- 2. Migrer les donnees existantes
UPDATE public.profiles SET status = 'inactive' WHERE is_active = false;
UPDATE public.profiles SET status = 'active' WHERE is_active = true;

-- 3. Supprimer l'ancienne colonne
ALTER TABLE public.profiles DROP COLUMN is_active;

-- 4. Mettre a jour la fonction helper user_is_active -> user_status
CREATE OR REPLACE FUNCTION public.user_is_active()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT status = 'active' FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Nouvelle fonction helper pour le statut
CREATE OR REPLACE FUNCTION public.user_status()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT status FROM public.profiles WHERE id = auth.uid()),
    'inactive'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6. Mettre a jour le trigger de protection des champs role/status
CREATE OR REPLACE FUNCTION public.protect_role_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Si c'est l'utilisateur lui-meme, bloquer
    IF auth.uid() = OLD.id THEN
      NEW.role := OLD.role;
      NEW.status := OLD.status;
    -- Si c'est un vendeur, bloquer
    ELSIF public.user_role() != 'proprietaire' THEN
      NEW.role := OLD.role;
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Mettre a jour handle_new_user pour definir le status initial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role, status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendeur'),
    COALESCE(NEW.raw_user_meta_data->>'status', 'active')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
