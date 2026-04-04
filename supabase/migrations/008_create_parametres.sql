-- ============================================================
-- Table parametres (single-row configuration)
-- ============================================================
CREATE TABLE public.parametres (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  prix_or NUMERIC(10,2) NOT NULL DEFAULT 0,
  prix_argent NUMERIC(10,2) NOT NULL DEFAULT 0,
  prix_platine NUMERIC(10,2) NOT NULL DEFAULT 0,
  coefficient_rachat NUMERIC(5,4) NOT NULL DEFAULT 0.8500,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the single row
INSERT INTO public.parametres (id) VALUES (1);

-- Enable RLS
ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (SELECT + UPDATE only, no INSERT/DELETE)
CREATE POLICY "Authenticated users can view parametres"
  ON public.parametres FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update parametres"
  ON public.parametres FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at
CREATE TRIGGER parametres_updated_at
  BEFORE UPDATE ON public.parametres
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
