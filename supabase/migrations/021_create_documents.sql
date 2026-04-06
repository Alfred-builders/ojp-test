-- ============================================================
-- Documents: store generated PDF metadata
-- ============================================================

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('quittance_rachat', 'contrat_rachat', 'devis_rachat')),
  numero TEXT NOT NULL,
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX documents_lot_id_idx ON public.documents(lot_id);
CREATE INDEX documents_dossier_id_idx ON public.documents(dossier_id);
CREATE INDEX documents_client_id_idx ON public.documents(client_id);

-- RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (true);

-- Storage bucket for PDF documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/read from the documents bucket
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can read documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'documents');
