-- ============================================================
-- Migration 075: Permettre la suppression d'un profil
-- Les FK created_by vers profiles bloquaient la suppression
-- On passe en ON DELETE SET NULL pour conserver les données
-- ============================================================

-- clients.created_by
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_created_by_fkey;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- lots.created_by
ALTER TABLE public.lots
  DROP CONSTRAINT IF EXISTS lots_created_by_fkey;
ALTER TABLE public.lots
  ADD CONSTRAINT lots_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- dossiers.created_by
ALTER TABLE public.dossiers
  DROP CONSTRAINT IF EXISTS dossiers_created_by_fkey;
ALTER TABLE public.dossiers
  ADD CONSTRAINT dossiers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
