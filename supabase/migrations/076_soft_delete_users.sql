-- ============================================================
-- Migration 076: Soft delete pour les utilisateurs
-- Ajouter "deleted" comme statut valide dans profiles
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'inactive', 'deleted'));
