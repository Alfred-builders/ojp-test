-- 047: Ajouter le statut "en_reparation" aux bijoux + table historique des réparations

-- A. Étendre le CHECK constraint de bijoux_stock.statut
ALTER TABLE public.bijoux_stock DROP CONSTRAINT IF EXISTS bijoux_stock_statut_check;
ALTER TABLE public.bijoux_stock ADD CONSTRAINT bijoux_stock_statut_check
  CHECK (statut IN ('en_stock','vendu','reserve','en_depot_vente','rendu_client','en_reparation'));

-- B. Créer la table reparations
CREATE TABLE public.reparations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bijou_id UUID NOT NULL REFERENCES public.bijoux_stock(id) ON DELETE CASCADE,
  description TEXT,
  cout_estime NUMERIC(10,2),
  cout_reel NUMERIC(10,2),
  notes TEXT,
  date_envoi TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_retour TIMESTAMPTZ,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','terminee')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index unique partiel : un seul envoi actif par bijou
CREATE UNIQUE INDEX one_active_repair_per_bijou ON public.reparations(bijou_id) WHERE statut = 'en_cours';

-- Trigger updated_at (réutilise la fonction existante)
CREATE TRIGGER reparations_updated_at BEFORE UPDATE ON public.reparations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE public.reparations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read reparations"
  ON public.reparations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert reparations"
  ON public.reparations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth users can update reparations"
  ON public.reparations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users can delete reparations"
  ON public.reparations FOR DELETE TO authenticated USING (true);
