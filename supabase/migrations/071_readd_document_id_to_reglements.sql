-- Re-add document_id FK to reglements (was lost during migration repairs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reglements' AND column_name = 'document_id'
  ) THEN
    ALTER TABLE public.reglements ADD COLUMN document_id UUID REFERENCES public.documents(id);
    CREATE INDEX IF NOT EXISTS idx_reglements_document_id ON public.reglements(document_id);
  END IF;
END $$;
