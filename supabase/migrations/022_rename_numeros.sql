-- ============================================================
-- Refactor naming: PREFIX-YYYY-NNNN format for all entities
-- ============================================================

-- ============================================================
-- 1. New trigger for dossiers: DOS-YYYY-NNNN
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_dossier_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
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

-- ============================================================
-- 2. New trigger for lots: RAC/VEN/DPV-YYYY-NNNN
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_lot_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_prefix TEXT;
  v_seq INT;
BEGIN
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

-- ============================================================
-- 3. Rename existing dossiers
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_seq INT := 0;
BEGIN
  FOR r IN SELECT id FROM public.dossiers ORDER BY created_at ASC
  LOOP
    v_seq := v_seq + 1;
    UPDATE public.dossiers
    SET numero = 'DOS-2026-' || LPAD(v_seq::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- ============================================================
-- 4. Rename existing lots
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_rac INT := 0;
  v_ven INT := 0;
  v_dpv INT := 0;
  v_prefix TEXT;
  v_seq INT;
BEGIN
  FOR r IN SELECT id, type FROM public.lots ORDER BY created_at ASC
  LOOP
    IF r.type = 'rachat' THEN
      v_rac := v_rac + 1; v_prefix := 'RAC'; v_seq := v_rac;
    ELSIF r.type = 'vente' THEN
      v_ven := v_ven + 1; v_prefix := 'VEN'; v_seq := v_ven;
    ELSIF r.type = 'depot_vente' THEN
      v_dpv := v_dpv + 1; v_prefix := 'DPV'; v_seq := v_dpv;
    ELSE
      v_prefix := 'LOT'; v_seq := v_rac + v_ven + v_dpv;
    END IF;

    UPDATE public.lots
    SET numero = v_prefix || '-2026-' || LPAD(v_seq::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- ============================================================
-- 5. Rename existing documents
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_qra INT := 0;
  v_cra INT := 0;
  v_dev INT := 0;
  v_prefix TEXT;
  v_seq INT;
BEGIN
  FOR r IN SELECT id, type FROM public.documents ORDER BY created_at ASC
  LOOP
    IF r.type = 'quittance_rachat' THEN
      v_qra := v_qra + 1; v_prefix := 'QRA'; v_seq := v_qra;
    ELSIF r.type = 'contrat_rachat' THEN
      v_cra := v_cra + 1; v_prefix := 'CRA'; v_seq := v_cra;
    ELSIF r.type = 'devis_rachat' THEN
      v_dev := v_dev + 1; v_prefix := 'DEV'; v_seq := v_dev;
    ELSE
      v_prefix := 'DOC'; v_seq := v_qra + v_cra + v_dev;
    END IF;

    UPDATE public.documents
    SET numero = v_prefix || '-2026-' || LPAD(v_seq::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;
