-- 049: Bons de livraison fonderie (envois de bijoux stock vers fonderies)

-- A. Ajouter statut 'fondu' à bijoux_stock
ALTER TABLE public.bijoux_stock DROP CONSTRAINT IF EXISTS bijoux_stock_statut_check;
ALTER TABLE public.bijoux_stock ADD CONSTRAINT bijoux_stock_statut_check
  CHECK (statut IN ('en_stock','vendu','reserve','en_depot_vente','rendu_client','en_reparation','fondu'));

-- B. Table bons_livraison
CREATE TABLE public.bons_livraison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  fonderie_id UUID NOT NULL REFERENCES public.fonderies(id),
  statut TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','envoye','recu','traite','annule')),
  poids_total NUMERIC(12,2) DEFAULT 0,
  valeur_estimee NUMERIC(12,2) DEFAULT 0,
  date_envoi TIMESTAMPTZ,
  date_reception TIMESTAMPTZ,
  date_traitement TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bons_livraison ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bons_livraison_select" ON public.bons_livraison FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "bons_livraison_insert" ON public.bons_livraison FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "bons_livraison_update" ON public.bons_livraison FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "bons_livraison_delete" ON public.bons_livraison FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger updated_at
CREATE TRIGGER bons_livraison_updated_at BEFORE UPDATE ON public.bons_livraison
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-generate BDL-YYYY-NNNN numero
CREATE OR REPLACE FUNCTION public.generate_bon_livraison_numero()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero FROM 'BDL-' || year_str || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.bons_livraison
  WHERE numero LIKE 'BDL-' || year_str || '-%';

  NEW.numero := 'BDL-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bon_livraison_numero_trigger
  BEFORE INSERT ON public.bons_livraison
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION public.generate_bon_livraison_numero();

-- C. Table bon_livraison_lignes
CREATE TABLE public.bon_livraison_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_livraison_id UUID NOT NULL REFERENCES public.bons_livraison(id) ON DELETE CASCADE,
  bijoux_stock_id UUID NOT NULL REFERENCES public.bijoux_stock(id),
  -- Snapshot at BDL creation
  designation TEXT NOT NULL,
  metal TEXT,
  titrage_declare TEXT,
  poids_declare NUMERIC(10,2),
  cours_utilise NUMERIC(10,2),
  valeur_estimee NUMERIC(12,2),
  -- Fonderie test results (filled later)
  titrage_reel TEXT,
  poids_reel NUMERIC(10,2),
  valeur_reelle NUMERIC(12,2),
  ecart_titrage BOOLEAN DEFAULT false,
  ecart_poids BOOLEAN DEFAULT false,
  ecart_notes TEXT,
  date_test TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bon_livraison_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bon_livraison_lignes_select" ON public.bon_livraison_lignes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "bon_livraison_lignes_insert" ON public.bon_livraison_lignes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "bon_livraison_lignes_update" ON public.bon_livraison_lignes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "bon_livraison_lignes_delete" ON public.bon_livraison_lignes FOR DELETE USING (auth.role() = 'authenticated');

-- D. Trigger to auto-update poids_total and valeur_estimee on bons_livraison
CREATE OR REPLACE FUNCTION public.update_bon_livraison_totals()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.bon_livraison_id, OLD.bon_livraison_id);
  UPDATE public.bons_livraison SET
    poids_total = COALESCE((
      SELECT SUM(poids_declare) FROM public.bon_livraison_lignes WHERE bon_livraison_id = target_id
    ), 0),
    valeur_estimee = COALESCE((
      SELECT SUM(valeur_estimee) FROM public.bon_livraison_lignes WHERE bon_livraison_id = target_id
    ), 0),
    updated_at = now()
  WHERE id = target_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bon_livraison_lignes_totals
  AFTER INSERT OR DELETE ON public.bon_livraison_lignes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bon_livraison_totals();

-- E. Extend documents type to include bon_livraison
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    'quittance_rachat','contrat_rachat','devis_rachat',
    'contrat_depot_vente','confie_achat','quittance_depot_vente',
    'facture_vente','facture_acompte','bon_commande','facture_solde',
    'bon_livraison'
  ));
