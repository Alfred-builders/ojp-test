-- ============================================================
-- Migration 014: Vente de bijoux
-- ============================================================

-- 1. Extend lots.status CHECK constraint to include vente statuses
ALTER TABLE public.lots DROP CONSTRAINT lots_status_check;
ALTER TABLE public.lots ADD CONSTRAINT lots_status_check CHECK (
  status IN (
    -- Rachat
    'brouillon', 'devis_envoye', 'accepte', 'refuse', 'en_retractation', 'finalise', 'retracte',
    -- Vente
    'nouveau', 'en_cours', 'livre', 'a_regler', 'termine', 'annule'
  )
);

-- 2. Add vente-specific columns to lots
ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS date_livraison TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_reglement TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mode_reglement TEXT CHECK (mode_reglement IN ('especes', 'carte', 'virement', 'cheque')),
  ADD COLUMN IF NOT EXISTS numero_facture TEXT;

-- ============================================================
-- Table vente_lignes
-- ============================================================
CREATE TABLE public.vente_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  bijoux_stock_id UUID REFERENCES public.bijoux_stock(id),
  designation TEXT NOT NULL,
  metal TEXT,
  qualite TEXT,
  poids NUMERIC(10,2),
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC(12,2) NOT NULL,
  prix_total NUMERIC(12,2) NOT NULL,
  taxe_applicable BOOLEAN DEFAULT false,
  montant_taxe NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX vente_lignes_lot_id_idx ON public.vente_lignes(lot_id);
CREATE INDEX vente_lignes_bijoux_stock_id_idx ON public.vente_lignes(bijoux_stock_id);

-- Enable RLS
ALTER TABLE public.vente_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vente_lignes"
  ON public.vente_lignes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert vente_lignes"
  ON public.vente_lignes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update vente_lignes"
  ON public.vente_lignes FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete vente_lignes"
  ON public.vente_lignes FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at
CREATE TRIGGER vente_lignes_updated_at
  BEFORE UPDATE ON public.vente_lignes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Trigger: aggregate vente totals from lignes
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_vente_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_lot_id UUID;
BEGIN
  v_lot_id := COALESCE(NEW.lot_id, OLD.lot_id);

  UPDATE public.lots SET
    total_prix_revente = COALESCE((SELECT SUM(prix_total) FROM public.vente_lignes WHERE lot_id = v_lot_id), 0),
    montant_taxe = COALESCE((SELECT SUM(montant_taxe) FROM public.vente_lignes WHERE lot_id = v_lot_id), 0),
    updated_at = now()
  WHERE id = v_lot_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vente_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.vente_lignes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vente_totals();

-- ============================================================
-- Table factures
-- ============================================================
CREATE TABLE public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL DEFAULT '',
  lot_id UUID NOT NULL REFERENCES public.lots(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_taxe NUMERIC(12,2) DEFAULT 0,
  montant_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  date_emission TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX factures_lot_id_idx ON public.factures(lot_id);

-- Enable RLS
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view factures"
  ON public.factures FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert factures"
  ON public.factures FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update factures"
  ON public.factures FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- Auto-generate facture numero: FAC-YYYY-NNNN
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_facture_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::TEXT;

  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.factures
  WHERE numero LIKE 'FAC-' || v_year || '-%';

  NEW.numero := 'FAC-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_facture_numero_trigger
  BEFORE INSERT ON public.factures
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION public.generate_facture_numero();
