-- ============================================================
-- Table lots
-- ============================================================
CREATE TABLE public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL DEFAULT '',
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE RESTRICT,
  type TEXT NOT NULL DEFAULT 'rachat' CHECK (type IN ('rachat', 'vente', 'depot_vente')),
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN (
    'brouillon',
    'devis_envoye',
    'accepte',
    'refuse',
    'en_retractation',
    'finalise',
    'retracte'
  )),

  -- Aggregated amounts (computed from references via trigger)
  total_prix_achat NUMERIC(12,2) DEFAULT 0,
  total_prix_revente NUMERIC(12,2) DEFAULT 0,
  marge_brute NUMERIC(12,2) DEFAULT 0,

  -- Tax fields (for or_investissement references)
  montant_taxe NUMERIC(12,2) DEFAULT 0,
  montant_net NUMERIC(12,2) DEFAULT 0,

  -- Retraction tracking
  date_acceptation TIMESTAMPTZ,
  date_fin_retractation TIMESTAMPTZ,
  date_finalisation TIMESTAMPTZ,

  -- Course prices snapshot at lot creation time
  cours_or_snapshot NUMERIC(10,2),
  cours_argent_snapshot NUMERIC(10,2),
  cours_platine_snapshot NUMERIC(10,2),
  coefficient_rachat_snapshot NUMERIC(5,4),

  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX lots_dossier_id_idx ON public.lots(dossier_id);
CREATE INDEX lots_status_idx ON public.lots(status);

-- Enable RLS
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lots"
  ON public.lots FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert lots"
  ON public.lots FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update lots"
  ON public.lots FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete lots"
  ON public.lots FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at
CREATE TRIGGER lots_updated_at
  BEFORE UPDATE ON public.lots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Auto-generate lot numero
-- Format: {DOSSIER_NUMERO}-LOT{SEQ}
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_lot_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_dossier_numero TEXT;
  v_seq INT;
BEGIN
  SELECT numero INTO v_dossier_numero FROM public.dossiers WHERE id = NEW.dossier_id;

  SELECT COUNT(*) + 1 INTO v_seq FROM public.lots WHERE dossier_id = NEW.dossier_id;

  NEW.numero := v_dossier_numero || '-LOT' || LPAD(v_seq::TEXT, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_lot_numero_trigger
  BEFORE INSERT ON public.lots
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION public.generate_lot_numero();

-- ============================================================
-- Table lot_references
-- ============================================================
CREATE TABLE public.lot_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,

  -- Item identification
  categorie TEXT NOT NULL CHECK (categorie IN ('bijoux', 'or_investissement')),
  designation TEXT NOT NULL,
  photo_url TEXT,

  -- Bijoux-specific fields
  metal TEXT CHECK (metal IN ('Or', 'Argent', 'Platine')),
  qualite TEXT CHECK (qualite IN ('333', '375', '585', '750', '999')),
  poids NUMERIC(10,2),

  -- Or investissement-specific fields
  or_investissement_id UUID REFERENCES public.or_investissement(id),
  is_scelle BOOLEAN DEFAULT false,
  has_facture BOOLEAN DEFAULT false,
  date_acquisition DATE,
  prix_acquisition NUMERIC(12,2),

  -- Calculated price fields
  cours_metal_utilise NUMERIC(10,2),
  coefficient_utilise NUMERIC(6,4),
  prix_achat NUMERIC(12,2) NOT NULL DEFAULT 0,
  prix_revente_estime NUMERIC(12,2),

  -- Tax per reference (for or investissement)
  regime_fiscal TEXT CHECK (regime_fiscal IN ('TPV', 'TMP')),
  montant_taxe NUMERIC(12,2) DEFAULT 0,
  tpv_eligible BOOLEAN DEFAULT false,
  tpv_montant NUMERIC(12,2),
  tmp_montant NUMERIC(12,2),

  -- Destination after finalization
  destination TEXT CHECK (destination IN ('stock_boutique', 'fonderie', 'depot_vente')),
  destination_stock_id UUID,

  -- Status
  status TEXT NOT NULL DEFAULT 'en_expertise' CHECK (status IN (
    'en_expertise',
    'expertise_ok',
    'bloque',
    'route_stock',
    'route_fonderie',
    'route_depot_vente',
    'retracte'
  )),

  quantite INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX lot_references_lot_id_idx ON public.lot_references(lot_id);

-- Enable RLS
ALTER TABLE public.lot_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lot_references"
  ON public.lot_references FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert lot_references"
  ON public.lot_references FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update lot_references"
  ON public.lot_references FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete lot_references"
  ON public.lot_references FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at
CREATE TRIGGER lot_references_updated_at
  BEFORE UPDATE ON public.lot_references
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Trigger: aggregate lot totals from references
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_lot_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_lot_id UUID;
BEGIN
  v_lot_id := COALESCE(NEW.lot_id, OLD.lot_id);

  UPDATE public.lots SET
    total_prix_achat = COALESCE((SELECT SUM(prix_achat * quantite) FROM public.lot_references WHERE lot_id = v_lot_id), 0),
    total_prix_revente = COALESCE((SELECT SUM(prix_revente_estime * quantite) FROM public.lot_references WHERE lot_id = v_lot_id), 0),
    montant_taxe = COALESCE((SELECT SUM(montant_taxe * quantite) FROM public.lot_references WHERE lot_id = v_lot_id), 0),
    marge_brute = COALESCE((SELECT SUM(prix_revente_estime * quantite) FROM public.lot_references WHERE lot_id = v_lot_id), 0)
               - COALESCE((SELECT SUM(prix_achat * quantite) FROM public.lot_references WHERE lot_id = v_lot_id), 0),
    montant_net = COALESCE((SELECT SUM(prix_achat * quantite) FROM public.lot_references WHERE lot_id = v_lot_id), 0)
               - COALESCE((SELECT SUM(montant_taxe * quantite) FROM public.lot_references WHERE lot_id = v_lot_id), 0),
    updated_at = now()
  WHERE id = v_lot_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lot_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.lot_references
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lot_totals();
