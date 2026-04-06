-- ============================================================
-- Migration 027: Auto-cancel expired acompte lots (48h deadline)
-- ============================================================

-- Function to auto-cancel lots where acompte was paid but solde not paid within 48h
CREATE OR REPLACE FUNCTION public.cancel_expired_acompte_lots()
RETURNS INTEGER AS $$
DECLARE
  cancelled_count INTEGER := 0;
  expired_lot RECORD;
BEGIN
  FOR expired_lot IN
    SELECT l.id, vl.bijoux_stock_id, bs.depot_vente_lot_id
    FROM public.lots l
    LEFT JOIN public.vente_lignes vl ON vl.lot_id = l.id
    LEFT JOIN public.bijoux_stock bs ON bs.id = vl.bijoux_stock_id
    WHERE l.type = 'vente'
      AND l.status = 'en_cours'
      AND l.acompte_paye = true
      AND l.solde_paye = false
      AND l.date_limite_solde < now()
  LOOP
    -- Revert bijoux stock items if any
    IF expired_lot.bijoux_stock_id IS NOT NULL THEN
      UPDATE public.bijoux_stock
      SET statut = CASE
        WHEN expired_lot.depot_vente_lot_id IS NOT NULL THEN 'en_depot_vente'
        ELSE 'en_stock'
      END
      WHERE id = expired_lot.bijoux_stock_id;
    END IF;

    -- Cancel the lot
    UPDATE public.lots
    SET status = 'annule'
    WHERE id = expired_lot.id
      AND status = 'en_cours';

    cancelled_count := cancelled_count + 1;
  END LOOP;

  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron extension if not already enabled
-- Note: pg_cron must be enabled in Supabase dashboard (Database > Extensions)
-- Then run: SELECT cron.schedule('cancel-expired-acompte', '*/15 * * * *', 'SELECT public.cancel_expired_acompte_lots()');
