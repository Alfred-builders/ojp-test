-- 051: Add 'a_fondre' status to bijoux_stock (intermediate before fonderie shipment)
ALTER TABLE public.bijoux_stock DROP CONSTRAINT IF EXISTS bijoux_stock_statut_check;
ALTER TABLE public.bijoux_stock ADD CONSTRAINT bijoux_stock_statut_check
  CHECK (statut IN ('en_stock','vendu','reserve','en_depot_vente','rendu_client','en_reparation','fondu','a_fondre'));
