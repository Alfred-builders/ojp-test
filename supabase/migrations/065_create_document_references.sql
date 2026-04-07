-- Junction table linking documents to their lot_references
-- Allows knowing which references are included in which document

CREATE TABLE IF NOT EXISTS document_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  lot_reference_id UUID NOT NULL REFERENCES lot_references(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, lot_reference_id)
);

-- Index for fast lookups in both directions
CREATE INDEX idx_document_references_document_id ON document_references(document_id);
CREATE INDEX idx_document_references_lot_reference_id ON document_references(lot_reference_id);

-- RLS
ALTER TABLE document_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read document_references"
  ON document_references FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert document_references"
  ON document_references FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete document_references"
  ON document_references FOR DELETE TO authenticated USING (true);
