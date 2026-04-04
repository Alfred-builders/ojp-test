-- Ajouter colonnes pays et annees
ALTER TABLE public.or_investissement ADD COLUMN IF NOT EXISTS pays TEXT;
ALTER TABLE public.or_investissement ADD COLUMN IF NOT EXISTS annees TEXT;

-- Changer la nomenclature metal pour matcher bijoux_stock (Or, Argent, Autres)
-- D'abord mettre à jour les données existantes
UPDATE public.or_investissement SET metal = 'Or' WHERE metal = 'OR';
UPDATE public.or_investissement SET metal = 'Argent' WHERE metal = 'ARGENT';
UPDATE public.or_investissement SET metal = 'Autres' WHERE metal = 'AUTRES';

ALTER TABLE public.or_investissement DROP CONSTRAINT IF EXISTS or_investissement_metal_check;
ALTER TABLE public.or_investissement ADD CONSTRAINT or_investissement_metal_check
  CHECK (metal IN ('Or', 'Argent', 'Autres'));
