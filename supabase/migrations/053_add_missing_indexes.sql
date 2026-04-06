-- ============================================================
-- 053: Add missing indexes for query performance
-- Focus on frequently-queried FK columns, status, created_at
-- ============================================================

-- clients
CREATE INDEX IF NOT EXISTS clients_created_at_idx ON public.clients (created_at DESC);

-- client_identity_documents
CREATE INDEX IF NOT EXISTS client_identity_documents_client_id_idx ON public.client_identity_documents (client_id);

-- dossiers
CREATE INDEX IF NOT EXISTS dossiers_status_idx ON public.dossiers (status);
CREATE INDEX IF NOT EXISTS dossiers_created_at_idx ON public.dossiers (created_at DESC);

-- lots
CREATE INDEX IF NOT EXISTS lots_created_at_idx ON public.lots (created_at DESC);
CREATE INDEX IF NOT EXISTS lots_type_idx ON public.lots (type);
CREATE INDEX IF NOT EXISTS lots_numero_idx ON public.lots (numero);

-- lot_references
CREATE INDEX IF NOT EXISTS lot_references_status_idx ON public.lot_references (status);
CREATE INDEX IF NOT EXISTS lot_references_or_investissement_id_idx ON public.lot_references (or_investissement_id) WHERE or_investissement_id IS NOT NULL;

-- vente_lignes
CREATE INDEX IF NOT EXISTS vente_lignes_or_investissement_id_idx ON public.vente_lignes (or_investissement_id) WHERE or_investissement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS vente_lignes_fulfillment_idx ON public.vente_lignes (fulfillment);

-- factures
CREATE INDEX IF NOT EXISTS factures_client_id_idx ON public.factures (client_id);
CREATE INDEX IF NOT EXISTS factures_numero_idx ON public.factures (numero);

-- documents
CREATE INDEX IF NOT EXISTS documents_type_idx ON public.documents (type);
CREATE INDEX IF NOT EXISTS documents_numero_idx ON public.documents (numero);

-- bons_commande
CREATE INDEX IF NOT EXISTS bons_commande_fonderie_id_idx ON public.bons_commande (fonderie_id);
CREATE INDEX IF NOT EXISTS bons_commande_statut_idx ON public.bons_commande (statut);

-- reglements
CREATE INDEX IF NOT EXISTS reglements_client_id_idx ON public.reglements (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reglements_fonderie_id_idx ON public.reglements (fonderie_id) WHERE fonderie_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reglements_date_reglement_idx ON public.reglements (date_reglement DESC);

-- bons_livraison
CREATE INDEX IF NOT EXISTS bons_livraison_fonderie_id_idx ON public.bons_livraison (fonderie_id);
CREATE INDEX IF NOT EXISTS bons_livraison_statut_idx ON public.bons_livraison (statut);

-- reparations
CREATE INDEX IF NOT EXISTS reparations_statut_idx ON public.reparations (statut);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS lots_dossier_status_idx ON public.lots (dossier_id, status);
CREATE INDEX IF NOT EXISTS reglements_lot_type_idx ON public.reglements (lot_id, type);
