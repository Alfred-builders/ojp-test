-- ============================================================
-- Validité client : fonction + colonne + trigger
-- ============================================================

-- Fonction pour vérifier si un client a une pièce d'identité valide (non expirée)
CREATE OR REPLACE FUNCTION public.is_client_valid(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.client_identity_documents
    WHERE client_id = p_client_id
      AND is_primary = true
      AND expiry_date IS NOT NULL
      AND expiry_date >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Ajouter la colonne is_valid sur clients
ALTER TABLE public.clients ADD COLUMN is_valid BOOLEAN NOT NULL DEFAULT false;

-- Mettre à jour les clients existants
UPDATE public.clients SET is_valid = public.is_client_valid(id);

-- Trigger pour recalculer is_valid quand les documents changent
CREATE OR REPLACE FUNCTION public.update_client_validity()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Déterminer le client_id concerné
  IF TG_OP = 'DELETE' THEN
    v_client_id := OLD.client_id;
  ELSE
    v_client_id := NEW.client_id;
  END IF;

  -- Recalculer la validité
  UPDATE public.clients
  SET is_valid = public.is_client_valid(v_client_id)
  WHERE id = v_client_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_validity_on_doc_change
  AFTER INSERT OR UPDATE OR DELETE ON public.client_identity_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_validity();

-- ============================================================
-- Table dossiers
-- ============================================================
CREATE TABLE public.dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert', 'ferme')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index sur client_id pour les jointures
CREATE INDEX dossiers_client_id_idx ON public.dossiers(client_id);

-- Enable RLS
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view dossiers"
  ON public.dossiers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert dossiers"
  ON public.dossiers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update dossiers"
  ON public.dossiers FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete dossiers"
  ON public.dossiers FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at
CREATE TRIGGER dossiers_updated_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Génération automatique du numéro de dossier
-- Format : DOS{DD}-{MM}-{YYYY}-{CLIENTLASTNAME}-{SEQ}
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_dossier_numero()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_date_prefix TEXT;
  v_seq INT;
BEGIN
  -- Récupérer le nom du client (en majuscules, sans espaces)
  SELECT UPPER(REPLACE(last_name, ' ', ''))
  INTO v_client_name
  FROM public.clients
  WHERE id = NEW.client_id;

  -- Construire le préfixe de date
  v_date_prefix := 'DOS' || to_char(now(), 'DD-MM-YYYY');

  -- Compter les dossiers existants avec le même préfixe pour la séquence
  SELECT COUNT(*) + 1
  INTO v_seq
  FROM public.dossiers
  WHERE numero LIKE v_date_prefix || '-' || v_client_name || '-%';

  -- Générer le numéro
  NEW.numero := v_date_prefix || '-' || v_client_name || '-' || LPAD(v_seq::TEXT, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_dossier_numero_trigger
  BEFORE INSERT ON public.dossiers
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION public.generate_dossier_numero();
