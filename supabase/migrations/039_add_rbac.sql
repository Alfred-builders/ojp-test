-- ============================================================
-- Migration 038: Role-Based Access Control (RBAC)
-- Ajoute les colonnes role et is_active sur profiles,
-- les fonctions helper, et met à jour le trigger d'inscription.
-- ============================================================

-- 1. Ajouter la colonne role avec contrainte CHECK
ALTER TABLE public.profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'vendeur'
  CONSTRAINT profiles_role_check CHECK (role IN ('proprietaire', 'vendeur'));

-- 2. Ajouter la colonne is_active pour désactiver des comptes
ALTER TABLE public.profiles
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. Fonction helper : retourne le rôle de l'utilisateur courant
-- SECURITY DEFINER pour bypasser le RLS de profiles (évite la dépendance circulaire)
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Fonction helper : vérifie si l'utilisateur est actif
CREATE OR REPLACE FUNCTION public.user_is_active()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Trigger BEFORE UPDATE pour empêcher un utilisateur de modifier son propre role ou is_active
CREATE OR REPLACE FUNCTION public.protect_role_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Seul un propriétaire peut modifier role et is_active
  -- Et personne ne peut modifier son propre role/is_active (sauf via admin/service role)
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    -- Si c'est l'utilisateur lui-même qui fait la modif, bloquer
    IF auth.uid() = OLD.id THEN
      NEW.role := OLD.role;
      NEW.is_active := OLD.is_active;
    -- Si c'est un vendeur qui essaie de modifier un autre profil, bloquer
    ELSIF public.user_role() != 'proprietaire' THEN
      NEW.role := OLD.role;
      NEW.is_active := OLD.is_active;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_role_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_role_fields();

-- 6. Mettre à jour le trigger handle_new_user pour accepter le role depuis metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendeur')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Mettre à jour les politiques RLS de profiles
-- Le propriétaire doit pouvoir voir tous les profils (gestion utilisateurs)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- SELECT : chacun voit son profil + propriétaire voit tous
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.user_role() = 'proprietaire');

-- UPDATE : chacun met à jour son propre profil (le trigger protège role/is_active)
-- Le propriétaire peut aussi mettre à jour les autres profils
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.user_role() = 'proprietaire');

-- INSERT : uniquement via trigger (auth.uid() = id)
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
