-- ============================================================
-- Fix race condition on all numero generation triggers
-- Solution: pg_advisory_xact_lock to serialize concurrent inserts
-- ============================================================

-- 1. Dossiers — DOS-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_dossier_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  -- Serialize concurrent inserts for dossier numbering
  PERFORM pg_advisory_xact_lock(hashtext('dossier_numero'));

  v_year := EXTRACT(YEAR FROM now())::TEXT;

  SELECT COALESCE(MAX(
    CASE WHEN numero ~ ('^DOS-' || v_year || '-\d+$')
    THEN CAST(SUBSTRING(numero FROM '\d+$') AS INT)
    ELSE 0 END
  ), 0) + 1
  INTO v_seq
  FROM public.dossiers;

  NEW.numero := 'DOS-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Lots — RAC/VEN/DPV-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_lot_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_prefix TEXT;
  v_seq INT;
BEGIN
  -- Serialize concurrent inserts for lot numbering
  PERFORM pg_advisory_xact_lock(hashtext('lot_numero'));

  v_year := EXTRACT(YEAR FROM now())::TEXT;

  IF NEW.type = 'rachat' THEN v_prefix := 'RAC';
  ELSIF NEW.type = 'vente' THEN v_prefix := 'VEN';
  ELSIF NEW.type = 'depot_vente' THEN v_prefix := 'DPV';
  ELSE v_prefix := 'LOT';
  END IF;

  SELECT COALESCE(MAX(
    CASE WHEN numero ~ ('^' || v_prefix || '-' || v_year || '-\d+$')
    THEN CAST(SUBSTRING(numero FROM '\d+$') AS INT)
    ELSE 0 END
  ), 0) + 1
  INTO v_seq
  FROM public.lots;

  NEW.numero := v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Factures — FAC-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_facture_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  -- Serialize concurrent inserts for facture numbering
  PERFORM pg_advisory_xact_lock(hashtext('facture_numero'));

  v_year := EXTRACT(YEAR FROM now())::TEXT;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero FROM 'FAC-' || v_year || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM public.factures
  WHERE numero LIKE 'FAC-' || v_year || '-%';

  NEW.numero := 'FAC-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Bons de commande — BDC-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_bon_commande_numero()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  -- Serialize concurrent inserts for bon commande numbering
  PERFORM pg_advisory_xact_lock(hashtext('bon_commande_numero'));

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

-- 5. Bons de livraison — BDL-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_bon_livraison_numero()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  -- Serialize concurrent inserts for bon livraison numbering
  PERFORM pg_advisory_xact_lock(hashtext('bon_livraison_numero'));

  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero FROM 'BDL-' || year_str || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.bons_livraison
  WHERE numero LIKE 'BDL-' || year_str || '-%';

  NEW.numero := 'BDL-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Documents — Generated client-side, add DB trigger for safety
-- Create trigger function for documents table using advisory lock
CREATE OR REPLACE FUNCTION public.generate_document_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_prefix TEXT;
  v_seq INT;
BEGIN
  -- Only generate if numero not already provided
  IF NEW.numero IS NOT NULL AND NEW.numero != '' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('document_numero'));

  v_year := EXTRACT(YEAR FROM now())::TEXT;

  -- Default prefix map
  v_prefix := CASE NEW.type
    WHEN 'quittance_rachat' THEN 'QRA'
    WHEN 'contrat_rachat' THEN 'CRA'
    WHEN 'devis_rachat' THEN 'DEV'
    WHEN 'contrat_depot_vente' THEN 'CDV'
    WHEN 'confie_achat' THEN 'CON'
    WHEN 'quittance_depot_vente' THEN 'QDV'
    WHEN 'facture_vente' THEN 'FVE'
    WHEN 'facture_acompte' THEN 'FAC'
    WHEN 'facture_solde' THEN 'FSO'
    WHEN 'bon_commande' THEN 'CMDF'
    WHEN 'bon_livraison' THEN 'BDL'
    ELSE 'DOC'
  END;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero FROM v_prefix || '-' || v_year || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM public.documents
  WHERE numero LIKE v_prefix || '-' || v_year || '-%';

  NEW.numero := v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_document_numero_trigger
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_document_numero();
