-- ============================================================
-- Migration 039: Mise à jour des politiques RLS par rôle
-- Applique les restrictions propriétaire/vendeur sur toutes les tables.
-- ============================================================

-- ============================================================
-- A) Tables PROPRIÉTAIRE-ONLY (aucun accès pour vendeur)
-- ============================================================

-- --- fonderies ---
DROP POLICY IF EXISTS "fonderies_select" ON public.fonderies;
DROP POLICY IF EXISTS "fonderies_insert" ON public.fonderies;
DROP POLICY IF EXISTS "fonderies_update" ON public.fonderies;
DROP POLICY IF EXISTS "fonderies_delete" ON public.fonderies;

CREATE POLICY "fonderies_select" ON public.fonderies FOR SELECT
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "fonderies_insert" ON public.fonderies FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "fonderies_update" ON public.fonderies FOR UPDATE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "fonderies_delete" ON public.fonderies FOR DELETE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');

-- --- bons_commande ---
DROP POLICY IF EXISTS "bons_commande_select" ON public.bons_commande;
DROP POLICY IF EXISTS "bons_commande_insert" ON public.bons_commande;
DROP POLICY IF EXISTS "bons_commande_update" ON public.bons_commande;
DROP POLICY IF EXISTS "bons_commande_delete" ON public.bons_commande;

CREATE POLICY "bons_commande_select" ON public.bons_commande FOR SELECT
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "bons_commande_insert" ON public.bons_commande FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "bons_commande_update" ON public.bons_commande FOR UPDATE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "bons_commande_delete" ON public.bons_commande FOR DELETE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');

-- --- parametres ---
DROP POLICY IF EXISTS "Authenticated users can view parametres" ON public.parametres;
DROP POLICY IF EXISTS "Authenticated users can update parametres" ON public.parametres;

CREATE POLICY "parametres_select" ON public.parametres FOR SELECT
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "parametres_update" ON public.parametres FOR UPDATE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');

-- --- email_templates ---
DROP POLICY IF EXISTS "auth_select_templates" ON public.email_templates;
DROP POLICY IF EXISTS "auth_update_templates" ON public.email_templates;

CREATE POLICY "email_templates_select" ON public.email_templates FOR SELECT
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "email_templates_update" ON public.email_templates FOR UPDATE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');

-- --- email_logs ---
DROP POLICY IF EXISTS "auth_select_logs" ON public.email_logs;
DROP POLICY IF EXISTS "auth_insert_logs" ON public.email_logs;

CREATE POLICY "email_logs_select" ON public.email_logs FOR SELECT
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "email_logs_insert" ON public.email_logs FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() = 'proprietaire');

-- ============================================================
-- B) Tables STOCK (lecture seule pour vendeur)
-- ============================================================

-- --- bijoux_stock ---
DROP POLICY IF EXISTS "Authenticated users can view stock" ON public.bijoux_stock;
DROP POLICY IF EXISTS "Authenticated users can insert stock" ON public.bijoux_stock;
DROP POLICY IF EXISTS "Authenticated users can update stock" ON public.bijoux_stock;
DROP POLICY IF EXISTS "Authenticated users can delete stock" ON public.bijoux_stock;

CREATE POLICY "bijoux_stock_select" ON public.bijoux_stock FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "bijoux_stock_insert" ON public.bijoux_stock FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "bijoux_stock_update" ON public.bijoux_stock FOR UPDATE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "bijoux_stock_delete" ON public.bijoux_stock FOR DELETE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');

-- --- or_investissement ---
DROP POLICY IF EXISTS "Authenticated users can view or_investissement" ON public.or_investissement;
DROP POLICY IF EXISTS "Authenticated users can insert or_investissement" ON public.or_investissement;
DROP POLICY IF EXISTS "Authenticated users can update or_investissement" ON public.or_investissement;
DROP POLICY IF EXISTS "Authenticated users can delete or_investissement" ON public.or_investissement;

CREATE POLICY "or_investissement_select" ON public.or_investissement FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "or_investissement_insert" ON public.or_investissement FOR INSERT
  WITH CHECK (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "or_investissement_update" ON public.or_investissement FOR UPDATE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');
CREATE POLICY "or_investissement_delete" ON public.or_investissement FOR DELETE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');

-- ============================================================
-- C) Tables avec SUPPRESSION restreinte (vendeur ne peut pas supprimer)
-- ============================================================

-- --- clients ---
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

CREATE POLICY "clients_select" ON public.clients FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "clients_insert" ON public.clients FOR INSERT
  WITH CHECK (public.user_is_active());
CREATE POLICY "clients_update" ON public.clients FOR UPDATE
  USING (public.user_is_active());
CREATE POLICY "clients_delete" ON public.clients FOR DELETE
  USING (public.user_is_active() AND public.user_role() = 'proprietaire');

-- ============================================================
-- D) Tables avec accès complet mais vérification is_active
-- ============================================================

-- --- client_identity_documents ---
DROP POLICY IF EXISTS "Authenticated users can view identity documents" ON public.client_identity_documents;
DROP POLICY IF EXISTS "Authenticated users can insert identity documents" ON public.client_identity_documents;
DROP POLICY IF EXISTS "Authenticated users can update identity documents" ON public.client_identity_documents;
DROP POLICY IF EXISTS "Authenticated users can delete identity documents" ON public.client_identity_documents;

CREATE POLICY "client_identity_documents_select" ON public.client_identity_documents FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "client_identity_documents_insert" ON public.client_identity_documents FOR INSERT
  WITH CHECK (public.user_is_active());
CREATE POLICY "client_identity_documents_update" ON public.client_identity_documents FOR UPDATE
  USING (public.user_is_active());
CREATE POLICY "client_identity_documents_delete" ON public.client_identity_documents FOR DELETE
  USING (public.user_is_active());

-- --- dossiers ---
DROP POLICY IF EXISTS "Authenticated users can view dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Authenticated users can insert dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Authenticated users can update dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Authenticated users can delete dossiers" ON public.dossiers;

CREATE POLICY "dossiers_select" ON public.dossiers FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "dossiers_insert" ON public.dossiers FOR INSERT
  WITH CHECK (public.user_is_active());
CREATE POLICY "dossiers_update" ON public.dossiers FOR UPDATE
  USING (public.user_is_active());
CREATE POLICY "dossiers_delete" ON public.dossiers FOR DELETE
  USING (public.user_is_active());

-- --- lots ---
DROP POLICY IF EXISTS "Authenticated users can view lots" ON public.lots;
DROP POLICY IF EXISTS "Authenticated users can insert lots" ON public.lots;
DROP POLICY IF EXISTS "Authenticated users can update lots" ON public.lots;
DROP POLICY IF EXISTS "Authenticated users can delete lots" ON public.lots;

CREATE POLICY "lots_select" ON public.lots FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "lots_insert" ON public.lots FOR INSERT
  WITH CHECK (public.user_is_active());
CREATE POLICY "lots_update" ON public.lots FOR UPDATE
  USING (public.user_is_active());
CREATE POLICY "lots_delete" ON public.lots FOR DELETE
  USING (public.user_is_active());

-- --- lot_references ---
DROP POLICY IF EXISTS "Authenticated users can view lot_references" ON public.lot_references;
DROP POLICY IF EXISTS "Authenticated users can insert lot_references" ON public.lot_references;
DROP POLICY IF EXISTS "Authenticated users can update lot_references" ON public.lot_references;
DROP POLICY IF EXISTS "Authenticated users can delete lot_references" ON public.lot_references;

CREATE POLICY "lot_references_select" ON public.lot_references FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "lot_references_insert" ON public.lot_references FOR INSERT
  WITH CHECK (public.user_is_active());
CREATE POLICY "lot_references_update" ON public.lot_references FOR UPDATE
  USING (public.user_is_active());
CREATE POLICY "lot_references_delete" ON public.lot_references FOR DELETE
  USING (public.user_is_active());

-- --- vente_lignes ---
DROP POLICY IF EXISTS "Authenticated users can view vente_lignes" ON public.vente_lignes;
DROP POLICY IF EXISTS "Authenticated users can insert vente_lignes" ON public.vente_lignes;
DROP POLICY IF EXISTS "Authenticated users can update vente_lignes" ON public.vente_lignes;
DROP POLICY IF EXISTS "Authenticated users can delete vente_lignes" ON public.vente_lignes;

CREATE POLICY "vente_lignes_select" ON public.vente_lignes FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "vente_lignes_insert" ON public.vente_lignes FOR INSERT
  WITH CHECK (public.user_is_active());
CREATE POLICY "vente_lignes_update" ON public.vente_lignes FOR UPDATE
  USING (public.user_is_active());
CREATE POLICY "vente_lignes_delete" ON public.vente_lignes FOR DELETE
  USING (public.user_is_active());

-- --- factures ---
DROP POLICY IF EXISTS "Authenticated users can view factures" ON public.factures;
DROP POLICY IF EXISTS "Authenticated users can insert factures" ON public.factures;
DROP POLICY IF EXISTS "Authenticated users can update factures" ON public.factures;

CREATE POLICY "factures_select" ON public.factures FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "factures_insert" ON public.factures FOR INSERT
  WITH CHECK (public.user_is_active());
CREATE POLICY "factures_update" ON public.factures FOR UPDATE
  USING (public.user_is_active());

-- --- documents ---
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.documents;

CREATE POLICY "documents_select" ON public.documents FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "documents_insert" ON public.documents FOR INSERT
  WITH CHECK (public.user_is_active());
CREATE POLICY "documents_delete" ON public.documents FOR DELETE
  USING (public.user_is_active());

-- --- reglements ---
DROP POLICY IF EXISTS "reglements_select" ON public.reglements;
DROP POLICY IF EXISTS "reglements_insert" ON public.reglements;
DROP POLICY IF EXISTS "reglements_update" ON public.reglements;
DROP POLICY IF EXISTS "reglements_delete" ON public.reglements;

CREATE POLICY "reglements_select" ON public.reglements FOR SELECT
  USING (public.user_is_active());
CREATE POLICY "reglements_insert" ON public.reglements FOR INSERT
  WITH CHECK (public.user_is_active());
CREATE POLICY "reglements_update" ON public.reglements FOR UPDATE
  USING (public.user_is_active());
CREATE POLICY "reglements_delete" ON public.reglements FOR DELETE
  USING (public.user_is_active());
