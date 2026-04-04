-- Table or_investissement : catalogue de pièces et lingots d'investissement
CREATE TABLE public.or_investissement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designation TEXT NOT NULL,
  poids NUMERIC(10,2),
  metal TEXT CHECK (metal IN ('OR', 'ARGENT', 'AUTRES')),
  titre TEXT,
  quantite INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.or_investissement ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view or_investissement"
  ON public.or_investissement FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert or_investissement"
  ON public.or_investissement FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update or_investissement"
  ON public.or_investissement FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete or_investissement"
  ON public.or_investissement FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at (réutilise la fonction existante)
CREATE TRIGGER or_investissement_updated_at
  BEFORE UPDATE ON public.or_investissement
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
