-- Table fonderies (fournisseurs d'or investissement)
CREATE TABLE public.fonderies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fonderies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fonderies_select" ON public.fonderies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "fonderies_insert" ON public.fonderies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "fonderies_update" ON public.fonderies FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "fonderies_delete" ON public.fonderies FOR DELETE USING (auth.role() = 'authenticated');

-- Ajouter fonderie_id sur vente_lignes
ALTER TABLE public.vente_lignes ADD COLUMN IF NOT EXISTS fonderie_id UUID REFERENCES public.fonderies(id);

-- Seeds
INSERT INTO public.fonderies (nom, adresse, code_postal, ville, telephone, email) VALUES
  ('CPoR Devises', '4 rue de la Bourse', '75002', 'Paris', '01 44 82 64 00', 'contact@cpor.fr'),
  ('Comptoir National de l''Or', '20 rue Vivienne', '75002', 'Paris', '01 42 96 10 00', 'contact@cno.fr'),
  ('Gold by Gold', '15 avenue des Champs-Élysées', '75008', 'Paris', '01 56 69 56 00', 'commandes@goldbygold.fr');
