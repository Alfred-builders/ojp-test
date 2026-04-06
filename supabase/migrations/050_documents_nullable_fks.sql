-- 050: Make documents FK columns nullable for bon_livraison (not tied to lot/dossier/client)

ALTER TABLE public.documents ALTER COLUMN lot_id DROP NOT NULL;
ALTER TABLE public.documents ALTER COLUMN dossier_id DROP NOT NULL;
ALTER TABLE public.documents ALTER COLUMN client_id DROP NOT NULL;

-- Add optional bon_livraison_id FK
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS bon_livraison_id UUID REFERENCES public.bons_livraison(id) ON DELETE CASCADE;
