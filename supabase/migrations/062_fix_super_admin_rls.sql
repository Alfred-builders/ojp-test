-- ============================================================
-- Fix: super_admin must have same RLS access as proprietaire
-- All policies that check user_role() = 'proprietaire' are updated
-- to check user_role() IN ('proprietaire', 'super_admin')
-- ============================================================

-- ============================================================
-- A) PROFILES (from 039)
-- ============================================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.user_role() IN ('proprietaire', 'super_admin'));

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.user_role() IN ('proprietaire', 'super_admin'));

-- ============================================================
-- B) OWNER-ONLY TABLES (from 040)
-- ============================================================

-- --- fonderies ---
DROP POLICY IF EXISTS "fonderies_select" ON public.fonderies;
DROP POLICY IF EXISTS "fonderies_insert" ON public.fonderies;
DROP POLICY IF EXISTS "fonderies_update" ON public.fonderies;
DROP POLICY IF EXISTS "fonderies_delete" ON public.fonderies;

CREATE POLICY "fonderies_select" ON public.fonderies FOR SELECT
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "fonderies_insert" ON public.fonderies FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "fonderies_update" ON public.fonderies FOR UPDATE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "fonderies_delete" ON public.fonderies FOR DELETE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));

-- --- bons_commande ---
DROP POLICY IF EXISTS "bons_commande_select" ON public.bons_commande;
DROP POLICY IF EXISTS "bons_commande_insert" ON public.bons_commande;
DROP POLICY IF EXISTS "bons_commande_update" ON public.bons_commande;
DROP POLICY IF EXISTS "bons_commande_delete" ON public.bons_commande;

CREATE POLICY "bons_commande_select" ON public.bons_commande FOR SELECT
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "bons_commande_insert" ON public.bons_commande FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "bons_commande_update" ON public.bons_commande FOR UPDATE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "bons_commande_delete" ON public.bons_commande FOR DELETE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));

-- --- parametres ---
DROP POLICY IF EXISTS "parametres_select" ON public.parametres;
DROP POLICY IF EXISTS "parametres_update" ON public.parametres;

CREATE POLICY "parametres_select" ON public.parametres FOR SELECT
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "parametres_update" ON public.parametres FOR UPDATE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));

-- --- email_templates ---
DROP POLICY IF EXISTS "email_templates_select" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_update" ON public.email_templates;

CREATE POLICY "email_templates_select" ON public.email_templates FOR SELECT
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "email_templates_update" ON public.email_templates FOR UPDATE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));

-- --- email_logs ---
DROP POLICY IF EXISTS "email_logs_select" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_insert" ON public.email_logs;

CREATE POLICY "email_logs_select" ON public.email_logs FOR SELECT
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "email_logs_insert" ON public.email_logs FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));

-- ============================================================
-- C) STOCK TABLES — write access (from 040)
-- ============================================================

-- --- bijoux_stock (write) ---
DROP POLICY IF EXISTS "bijoux_stock_insert" ON public.bijoux_stock;
DROP POLICY IF EXISTS "bijoux_stock_update" ON public.bijoux_stock;
DROP POLICY IF EXISTS "bijoux_stock_delete" ON public.bijoux_stock;

CREATE POLICY "bijoux_stock_insert" ON public.bijoux_stock FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "bijoux_stock_update" ON public.bijoux_stock FOR UPDATE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "bijoux_stock_delete" ON public.bijoux_stock FOR DELETE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));

-- --- or_investissement (write) ---
DROP POLICY IF EXISTS "or_investissement_insert" ON public.or_investissement;
DROP POLICY IF EXISTS "or_investissement_update" ON public.or_investissement;
DROP POLICY IF EXISTS "or_investissement_delete" ON public.or_investissement;

CREATE POLICY "or_investissement_insert" ON public.or_investissement FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "or_investissement_update" ON public.or_investissement FOR UPDATE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));
CREATE POLICY "or_investissement_delete" ON public.or_investissement FOR DELETE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));

-- ============================================================
-- D) DELETE-ONLY restriction (from 040)
-- ============================================================

-- --- clients (delete) ---
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_delete" ON public.clients FOR DELETE
  USING (public.user_is_active() AND public.user_role() IN ('proprietaire', 'super_admin'));

-- ============================================================
-- E) SETTINGS + STORAGE (from 052)
-- ============================================================

-- --- settings ---
DROP POLICY IF EXISTS "Proprietaire can read settings" ON public.settings;
DROP POLICY IF EXISTS "Proprietaire can update settings" ON public.settings;
DROP POLICY IF EXISTS "Proprietaire can insert settings" ON public.settings;

CREATE POLICY "Owner can read settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (user_role() IN ('proprietaire', 'super_admin'));

CREATE POLICY "Owner can update settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (user_role() IN ('proprietaire', 'super_admin'))
  WITH CHECK (user_role() IN ('proprietaire', 'super_admin'));

CREATE POLICY "Owner can insert settings"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (user_role() IN ('proprietaire', 'super_admin'));

-- --- identity-documents storage ---
DROP POLICY IF EXISTS "Proprietaire can upload identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Proprietaire can view identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Proprietaire can update identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Proprietaire can delete identity documents" ON storage.objects;

CREATE POLICY "Owner can upload identity documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'identity-documents' AND user_role() IN ('proprietaire', 'super_admin'));

CREATE POLICY "Owner can view identity documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'identity-documents' AND user_role() IN ('proprietaire', 'super_admin'));

CREATE POLICY "Owner can update identity documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'identity-documents' AND user_role() IN ('proprietaire', 'super_admin'))
  WITH CHECK (bucket_id = 'identity-documents' AND user_role() IN ('proprietaire', 'super_admin'));

CREATE POLICY "Owner can delete identity documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'identity-documents' AND user_role() IN ('proprietaire', 'super_admin'));
