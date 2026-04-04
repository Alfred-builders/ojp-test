-- RPC pour incrémenter la quantité d'or investissement (utilisé lors de la finalisation d'un lot)
CREATE OR REPLACE FUNCTION public.increment_or_invest_quantite(p_id UUID, p_qty INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.or_investissement
  SET quantite = quantite + p_qty,
      updated_at = now()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
