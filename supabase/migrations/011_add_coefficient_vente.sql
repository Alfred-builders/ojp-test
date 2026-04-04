-- Ajouter le coefficient de vente dans les paramètres
ALTER TABLE public.parametres
  ADD COLUMN coefficient_vente NUMERIC(5,4) NOT NULL DEFAULT 1.0500;

-- Ajouter le snapshot du coefficient de vente dans les lots
ALTER TABLE public.lots
  ADD COLUMN coefficient_vente_snapshot NUMERIC(5,4);
