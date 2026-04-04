-- Table clients : gestion des clients pour Or au Juste Prix
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  civility TEXT NOT NULL CHECK (civility IN ('M', 'Mme')),
  first_name TEXT NOT NULL CHECK (char_length(first_name) <= 100),
  last_name TEXT NOT NULL CHECK (char_length(last_name) <= 100),
  maiden_name TEXT CHECK (char_length(maiden_name) <= 100),
  email TEXT,
  phone TEXT CHECK (char_length(phone) <= 20),
  address TEXT CHECK (char_length(address) <= 255),
  city TEXT CHECK (char_length(city) <= 100),
  postal_code TEXT CHECK (char_length(postal_code) <= 10),
  country TEXT DEFAULT 'France' CHECK (char_length(country) <= 100),
  lead_source TEXT CHECK (char_length(lead_source) <= 100),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clients"
  ON public.clients FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete clients"
  ON public.clients FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at (reuse existing function)
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Full-text search vector trigger
CREATE OR REPLACE FUNCTION public.clients_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.first_name, '') || ' ' ||
    coalesce(NEW.last_name, '') || ' ' ||
    coalesce(NEW.maiden_name, '') || ' ' ||
    coalesce(NEW.phone, '') || ' ' ||
    coalesce(NEW.email, '') || ' ' ||
    coalesce(NEW.city, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_search_vector
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.clients_search_vector_update();

-- GIN index for full-text search
CREATE INDEX clients_search_vector_idx ON public.clients USING GIN (search_vector);

-- ============================================================
-- Table client_identity_documents : pièces d'identité des clients
-- ============================================================
CREATE TABLE public.client_identity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('cni', 'passeport', 'titre_sejour', 'permis_conduire')),
  document_number TEXT NOT NULL CHECK (char_length(document_number) <= 50),
  issue_date DATE,
  expiry_date DATE,
  nationality TEXT DEFAULT 'Française',
  photo_url TEXT,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique index: one primary document per client
CREATE UNIQUE INDEX unique_primary_doc_per_client
  ON public.client_identity_documents(client_id)
  WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.client_identity_documents ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view identity documents"
  ON public.client_identity_documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert identity documents"
  ON public.client_identity_documents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update identity documents"
  ON public.client_identity_documents FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete identity documents"
  ON public.client_identity_documents FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at
CREATE TRIGGER client_identity_documents_updated_at
  BEFORE UPDATE ON public.client_identity_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Storage bucket for identity document photos (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload identity documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'identity-documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view identity documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'identity-documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update identity documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'identity-documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete identity documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'identity-documents'
    AND auth.role() = 'authenticated'
  );
