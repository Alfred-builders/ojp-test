-- Table bijoux_stock : stock de bijoux pour Or au Juste Prix
CREATE TABLE public.bijoux_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  statut TEXT NOT NULL DEFAULT 'en_stock'
    CHECK (statut IN ('en_stock', 'vendu', 'reserve')),
  poids NUMERIC(10,1),
  quantite NUMERIC(10,1) DEFAULT 1,
  titrage TEXT,
  metaux TEXT CHECK (metaux IN ('Or', 'Platine', 'Argent')),
  qualite TEXT CHECK (qualite IN ('333', '375', '585', '750', '999')),
  prix_achat NUMERIC(10,2),
  prix_revente NUMERIC(10,2),
  date_creation TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bijoux_stock ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view stock"
  ON public.bijoux_stock FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert stock"
  ON public.bijoux_stock FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stock"
  ON public.bijoux_stock FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete stock"
  ON public.bijoux_stock FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bijoux_stock_updated_at
  BEFORE UPDATE ON public.bijoux_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
