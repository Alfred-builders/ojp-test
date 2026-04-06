-- ============================================================
-- 052: Security hardening before production
-- ============================================================

-- 1. Make documents bucket PRIVATE (was public — all PDFs were readable without auth)
UPDATE storage.buckets
SET public = false
WHERE id = 'documents';

-- Remove the old public read policy
DROP POLICY IF EXISTS "Anyone can read documents" ON storage.objects;

-- Add authenticated-only read policy for documents bucket
CREATE POLICY "Authenticated users can read documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

-- 2. Restrict settings table to proprietaire only
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;

CREATE POLICY "Proprietaire can read settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (user_role() = 'proprietaire');

CREATE POLICY "Proprietaire can update settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (user_role() = 'proprietaire')
  WITH CHECK (user_role() = 'proprietaire');

CREATE POLICY "Proprietaire can insert settings"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (user_role() = 'proprietaire');

-- 3. Restrict identity-documents bucket to proprietaire only
DROP POLICY IF EXISTS "Authenticated users can upload identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete identity documents" ON storage.objects;

CREATE POLICY "Proprietaire can upload identity documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'identity-documents' AND user_role() = 'proprietaire');

CREATE POLICY "Proprietaire can view identity documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'identity-documents' AND user_role() = 'proprietaire');

CREATE POLICY "Proprietaire can update identity documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'identity-documents' AND user_role() = 'proprietaire')
  WITH CHECK (bucket_id = 'identity-documents' AND user_role() = 'proprietaire');

CREATE POLICY "Proprietaire can delete identity documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'identity-documents' AND user_role() = 'proprietaire');
