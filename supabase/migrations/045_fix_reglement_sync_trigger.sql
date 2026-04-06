-- Fix reglement_sync_lot trigger:
-- Old trigger only fired on INSERT. Missing DELETE and UPDATE.
-- When a reglement is deleted, lot flags (acompte_paye, solde_paye) must be re-evaluated.

-- Replace the function to handle INSERT, UPDATE, and DELETE
CREATE OR REPLACE FUNCTION public.sync_reglement_to_lot()
RETURNS TRIGGER AS $$
DECLARE
  v_lot_id UUID;
  v_has_acompte BOOLEAN;
  v_has_solde BOOLEAN;
  v_last_reg RECORD;
BEGIN
  -- Determine which lot to update
  v_lot_id := COALESCE(NEW.lot_id, OLD.lot_id);

  IF TG_OP = 'INSERT' THEN
    -- Original INSERT logic (fast path)
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
  END IF;

  -- For DELETE and UPDATE: re-evaluate from scratch
  -- Check if any acompte reglement still exists
  SELECT EXISTS(
    SELECT 1 FROM public.reglements WHERE lot_id = v_lot_id AND type = 'acompte'
  ) INTO v_has_acompte;

  -- Check if any solde reglement still exists
  SELECT EXISTS(
    SELECT 1 FROM public.reglements WHERE lot_id = v_lot_id AND type = 'solde'
  ) INTO v_has_solde;

  -- Get the most recent reglement for mode/date
  SELECT mode, date_reglement, type
  INTO v_last_reg
  FROM public.reglements
  WHERE lot_id = v_lot_id
  ORDER BY date_reglement DESC, created_at DESC
  LIMIT 1;

  UPDATE public.lots SET
    acompte_paye = v_has_acompte,
    date_acompte = (SELECT MAX(date_reglement) FROM public.reglements WHERE lot_id = v_lot_id AND type = 'acompte'),
    solde_paye = v_has_solde,
    date_solde = (SELECT MAX(date_reglement) FROM public.reglements WHERE lot_id = v_lot_id AND type = 'solde'),
    mode_reglement = v_last_reg.mode,
    date_reglement = v_last_reg.date_reglement
  WHERE id = v_lot_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Replace the old trigger (was only AFTER INSERT)
DROP TRIGGER IF EXISTS reglement_sync_lot ON public.reglements;

CREATE TRIGGER reglement_sync_lot
  AFTER INSERT OR UPDATE OR DELETE ON public.reglements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reglement_to_lot();
