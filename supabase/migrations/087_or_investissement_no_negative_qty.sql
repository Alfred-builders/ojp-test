-- Prevent or_investissement.quantite from going negative
ALTER TABLE public.or_investissement
  ADD CONSTRAINT or_investissement_quantite_non_negative
  CHECK (quantite >= 0);

-- Update RPC to raise a clear error before the constraint fires
CREATE OR REPLACE FUNCTION public.increment_or_invest_quantite(p_id UUID, p_qty INT)
RETURNS VOID AS $$
DECLARE
  v_current INT;
BEGIN
  SELECT quantite INTO v_current
  FROM public.or_investissement
  WHERE id = p_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Produit or investissement introuvable (id: %)', p_id;
  END IF;

  IF v_current + p_qty < 0 THEN
    RAISE EXCEPTION 'Stock insuffisant : quantité actuelle = %, décrémentation demandée = %', v_current, abs(p_qty);
  END IF;

  UPDATE public.or_investissement
  SET quantite = quantite + p_qty,
      updated_at = now()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;
