-- Table reglements (unified payment tracking)
CREATE TABLE public.reglements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  bon_commande_id UUID REFERENCES public.bons_commande(id),
  sens TEXT NOT NULL CHECK (sens IN ('entrant', 'sortant')),
  type TEXT NOT NULL CHECK (type IN ('rachat','vente','acompte','solde','fonderie')),
  montant NUMERIC(12,2) NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('especes','carte','virement','cheque')),
  date_reglement TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_id UUID REFERENCES public.clients(id),
  fonderie_id UUID REFERENCES public.fonderies(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reglements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reglements_select" ON public.reglements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "reglements_insert" ON public.reglements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "reglements_update" ON public.reglements FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "reglements_delete" ON public.reglements FOR DELETE USING (auth.role() = 'authenticated');

CREATE INDEX reglements_lot_id_idx ON public.reglements(lot_id);
CREATE INDEX reglements_bon_commande_id_idx ON public.reglements(bon_commande_id);

-- Sync trigger: keep old lot fields in sync for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_reglement_to_lot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'acompte' THEN
    UPDATE public.lots SET
      acompte_paye = true,
      date_acompte = NEW.date_reglement,
      mode_reglement = NEW.mode
    WHERE id = NEW.lot_id;
  ELSIF NEW.type = 'solde' THEN
    UPDATE public.lots SET
      solde_paye = true,
      date_solde = NEW.date_reglement,
      mode_reglement = NEW.mode,
      date_reglement = NEW.date_reglement
    WHERE id = NEW.lot_id;
  ELSIF NEW.type IN ('vente', 'rachat') THEN
    UPDATE public.lots SET
      mode_reglement = NEW.mode,
      date_reglement = NEW.date_reglement
    WHERE id = NEW.lot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reglement_sync_lot
  AFTER INSERT ON public.reglements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reglement_to_lot();
