-- Add missing UPDATE RLS policy on documents table
CREATE POLICY "Authenticated users can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
