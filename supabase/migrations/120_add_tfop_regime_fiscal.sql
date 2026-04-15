-- Add TFOP (Taxe Forfaitaire sur les Objets Précieux) to allowed regime_fiscal values
ALTER TABLE lot_references DROP CONSTRAINT lot_references_regime_fiscal_check;
ALTER TABLE lot_references ADD CONSTRAINT lot_references_regime_fiscal_check
  CHECK (regime_fiscal IN ('TPV', 'TMP', 'TFOP'));
