-- Fix update_bon_commande_total trigger:
-- Old trigger only fired on UPDATE OF bon_commande_id.
-- Missing: INSERT (new ligne with bdc_id), DELETE (ligne removed), UPDATE of prix_total.

CREATE OR REPLACE FUNCTION public.update_bon_commande_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate old BDC (UPDATE that changed bdc_id, or DELETE)
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.bon_commande_id IS NOT NULL THEN
    UPDATE public.bons_commande SET
      montant_total = COALESCE((
        SELECT SUM(prix_total) FROM public.vente_lignes WHERE bon_commande_id = OLD.bon_commande_id
      ), 0),
      updated_at = now()
    WHERE id = OLD.bon_commande_id;
  END IF;

  -- Recalculate new BDC (INSERT or UPDATE)
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.bon_commande_id IS NOT NULL THEN
    UPDATE public.bons_commande SET
      montant_total = COALESCE((
        SELECT SUM(prix_total) FROM public.vente_lignes WHERE bon_commande_id = NEW.bon_commande_id
      ), 0),
      updated_at = now()
    WHERE id = NEW.bon_commande_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Replace the old trigger (was only AFTER UPDATE OF bon_commande_id)
DROP TRIGGER IF EXISTS vente_lignes_bon_commande_total ON public.vente_lignes;

CREATE TRIGGER vente_lignes_bon_commande_total
  AFTER INSERT OR UPDATE OR DELETE ON public.vente_lignes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bon_commande_total();
