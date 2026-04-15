-- Add poids_brut and poids_net columns to lot_references
ALTER TABLE public.lot_references
  ADD COLUMN poids_brut NUMERIC(10,2),
  ADD COLUMN poids_net NUMERIC(10,2);

-- Migrate existing data: poids -> poids_net and poids_brut
UPDATE public.lot_references
  SET poids_net = poids, poids_brut = poids
  WHERE poids IS NOT NULL;

-- Add poids_brut and poids_net columns to bijoux_stock
ALTER TABLE public.bijoux_stock
  ADD COLUMN poids_brut NUMERIC(10,2),
  ADD COLUMN poids_net NUMERIC(10,2);

-- Migrate existing bijoux_stock data
UPDATE public.bijoux_stock
  SET poids_net = poids, poids_brut = poids
  WHERE poids IS NOT NULL;

-- Add poids_brut and poids_net columns to vente_lignes
ALTER TABLE public.vente_lignes
  ADD COLUMN poids_brut NUMERIC(10,2),
  ADD COLUMN poids_net NUMERIC(10,2);

-- Migrate existing vente_lignes data
UPDATE public.vente_lignes
  SET poids_net = poids, poids_brut = poids
  WHERE poids IS NOT NULL;
