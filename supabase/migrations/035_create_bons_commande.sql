-- Table bons_commande (purchase orders fonderie)
CREATE TABLE public.bons_commande (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  fonderie_id UUID NOT NULL REFERENCES public.fonderies(id),
  statut TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','envoye','recu','paye','annule')),
  montant_total NUMERIC(12,2) DEFAULT 0,
  date_envoi TIMESTAMPTZ,
  date_reception TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bons_commande ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bons_commande_select" ON public.bons_commande FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "bons_commande_insert" ON public.bons_commande FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "bons_commande_update" ON public.bons_commande FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "bons_commande_delete" ON public.bons_commande FOR DELETE USING (auth.role() = 'authenticated');

-- Auto-generate BDC-YYYY-NNNN numero
CREATE OR REPLACE FUNCTION public.generate_bon_commande_numero()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero FROM 'BDC-' || year_str || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.bons_commande
  WHERE numero LIKE 'BDC-' || year_str || '-%';

  NEW.numero := 'BDC-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bon_commande_numero_trigger
  BEFORE INSERT ON public.bons_commande
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION public.generate_bon_commande_numero();

-- Link vente_lignes to bon de commande
ALTER TABLE public.vente_lignes
  ADD COLUMN IF NOT EXISTS bon_commande_id UUID REFERENCES public.bons_commande(id);

-- Trigger to auto-update montant_total when lignes are attached
CREATE OR REPLACE FUNCTION public.update_bon_commande_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Update old bon_commande if changed
  IF OLD.bon_commande_id IS NOT NULL AND (NEW.bon_commande_id IS DISTINCT FROM OLD.bon_commande_id) THEN
    UPDATE public.bons_commande SET
      montant_total = COALESCE((
        SELECT SUM(prix_total) FROM public.vente_lignes WHERE bon_commande_id = OLD.bon_commande_id
      ), 0),
      updated_at = now()
    WHERE id = OLD.bon_commande_id;
  END IF;

  -- Update new bon_commande
  IF NEW.bon_commande_id IS NOT NULL THEN
    UPDATE public.bons_commande SET
      montant_total = COALESCE((
        SELECT SUM(prix_total) FROM public.vente_lignes WHERE bon_commande_id = NEW.bon_commande_id
      ), 0),
      updated_at = now()
    WHERE id = NEW.bon_commande_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vente_lignes_bon_commande_total
  AFTER UPDATE OF bon_commande_id ON public.vente_lignes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bon_commande_total();
