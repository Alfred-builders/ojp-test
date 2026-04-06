-- ============================================================
-- 054: Add missing FK constraints with proper ON DELETE behavior
-- ============================================================
-- This migration:
-- 1. Cleans orphaned references (SET NULL where target row doesn't exist)
-- 2. Re-creates FK constraints with explicit ON DELETE for NOT NULL columns (RESTRICT)
-- 3. Re-creates FK constraints with ON DELETE SET NULL for nullable columns
-- 4. Adds the missing FK on lot_references.destination_stock_id

-- ============================================================
-- PHASE 1: Clean orphaned references before adding constraints
-- ============================================================

-- lot_references.destination_stock_id (no FK exists — may have orphans)
UPDATE public.lot_references SET destination_stock_id = NULL
  WHERE destination_stock_id IS NOT NULL
  AND destination_stock_id NOT IN (SELECT id FROM public.bijoux_stock);

-- lot_references.or_investissement_id
UPDATE public.lot_references SET or_investissement_id = NULL
  WHERE or_investissement_id IS NOT NULL
  AND or_investissement_id NOT IN (SELECT id FROM public.or_investissement);

-- vente_lignes.bijoux_stock_id
UPDATE public.vente_lignes SET bijoux_stock_id = NULL
  WHERE bijoux_stock_id IS NOT NULL
  AND bijoux_stock_id NOT IN (SELECT id FROM public.bijoux_stock);

-- vente_lignes.or_investissement_id
UPDATE public.vente_lignes SET or_investissement_id = NULL
  WHERE or_investissement_id IS NOT NULL
  AND or_investissement_id NOT IN (SELECT id FROM public.or_investissement);

-- vente_lignes.fonderie_id
UPDATE public.vente_lignes SET fonderie_id = NULL
  WHERE fonderie_id IS NOT NULL
  AND fonderie_id NOT IN (SELECT id FROM public.fonderies);

-- vente_lignes.bon_commande_id
UPDATE public.vente_lignes SET bon_commande_id = NULL
  WHERE bon_commande_id IS NOT NULL
  AND bon_commande_id NOT IN (SELECT id FROM public.bons_commande);

-- reglements.bon_commande_id
UPDATE public.reglements SET bon_commande_id = NULL
  WHERE bon_commande_id IS NOT NULL
  AND bon_commande_id NOT IN (SELECT id FROM public.bons_commande);

-- reglements.client_id
UPDATE public.reglements SET client_id = NULL
  WHERE client_id IS NOT NULL
  AND client_id NOT IN (SELECT id FROM public.clients);

-- reglements.fonderie_id
UPDATE public.reglements SET fonderie_id = NULL
  WHERE fonderie_id IS NOT NULL
  AND fonderie_id NOT IN (SELECT id FROM public.fonderies);

-- email_logs.lot_id
UPDATE public.email_logs SET lot_id = NULL
  WHERE lot_id IS NOT NULL
  AND lot_id NOT IN (SELECT id FROM public.lots);

-- email_logs.dossier_id
UPDATE public.email_logs SET dossier_id = NULL
  WHERE dossier_id IS NOT NULL
  AND dossier_id NOT IN (SELECT id FROM public.dossiers);

-- email_logs.client_id
UPDATE public.email_logs SET client_id = NULL
  WHERE client_id IS NOT NULL
  AND client_id NOT IN (SELECT id FROM public.clients);

-- bijoux_stock.depot_vente_lot_id
UPDATE public.bijoux_stock SET depot_vente_lot_id = NULL
  WHERE depot_vente_lot_id IS NOT NULL
  AND depot_vente_lot_id NOT IN (SELECT id FROM public.lots);

-- bijoux_stock.deposant_client_id
UPDATE public.bijoux_stock SET deposant_client_id = NULL
  WHERE deposant_client_id IS NOT NULL
  AND deposant_client_id NOT IN (SELECT id FROM public.clients);


-- ============================================================
-- PHASE 2A: NOT NULL columns — DROP + ADD with ON DELETE RESTRICT
-- ============================================================

-- lots.created_by → profiles(id) RESTRICT
ALTER TABLE public.lots
  DROP CONSTRAINT IF EXISTS lots_created_by_fkey,
  ADD CONSTRAINT lots_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- dossiers.created_by → profiles(id) RESTRICT
ALTER TABLE public.dossiers
  DROP CONSTRAINT IF EXISTS dossiers_created_by_fkey,
  ADD CONSTRAINT dossiers_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- factures.lot_id → lots(id) RESTRICT
ALTER TABLE public.factures
  DROP CONSTRAINT IF EXISTS factures_lot_id_fkey,
  ADD CONSTRAINT factures_lot_id_fkey
    FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;

-- factures.client_id → clients(id) RESTRICT
ALTER TABLE public.factures
  DROP CONSTRAINT IF EXISTS factures_client_id_fkey,
  ADD CONSTRAINT factures_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;

-- bons_commande.fonderie_id → fonderies(id) RESTRICT
ALTER TABLE public.bons_commande
  DROP CONSTRAINT IF EXISTS bons_commande_fonderie_id_fkey,
  ADD CONSTRAINT bons_commande_fonderie_id_fkey
    FOREIGN KEY (fonderie_id) REFERENCES public.fonderies(id) ON DELETE RESTRICT;

-- bons_livraison.fonderie_id → fonderies(id) RESTRICT
ALTER TABLE public.bons_livraison
  DROP CONSTRAINT IF EXISTS bons_livraison_fonderie_id_fkey,
  ADD CONSTRAINT bons_livraison_fonderie_id_fkey
    FOREIGN KEY (fonderie_id) REFERENCES public.fonderies(id) ON DELETE RESTRICT;

-- bon_livraison_lignes.bijoux_stock_id → bijoux_stock(id) RESTRICT
ALTER TABLE public.bon_livraison_lignes
  DROP CONSTRAINT IF EXISTS bon_livraison_lignes_bijoux_stock_id_fkey,
  ADD CONSTRAINT bon_livraison_lignes_bijoux_stock_id_fkey
    FOREIGN KEY (bijoux_stock_id) REFERENCES public.bijoux_stock(id) ON DELETE RESTRICT;


-- ============================================================
-- PHASE 2B: NULLABLE columns — DROP + ADD with ON DELETE SET NULL
-- ============================================================

-- lot_references.or_investissement_id → or_investissement(id) SET NULL
ALTER TABLE public.lot_references
  DROP CONSTRAINT IF EXISTS lot_references_or_investissement_id_fkey,
  ADD CONSTRAINT lot_references_or_investissement_id_fkey
    FOREIGN KEY (or_investissement_id) REFERENCES public.or_investissement(id) ON DELETE SET NULL;

-- vente_lignes.bijoux_stock_id → bijoux_stock(id) SET NULL
ALTER TABLE public.vente_lignes
  DROP CONSTRAINT IF EXISTS vente_lignes_bijoux_stock_id_fkey,
  ADD CONSTRAINT vente_lignes_bijoux_stock_id_fkey
    FOREIGN KEY (bijoux_stock_id) REFERENCES public.bijoux_stock(id) ON DELETE SET NULL;

-- vente_lignes.or_investissement_id → or_investissement(id) SET NULL
ALTER TABLE public.vente_lignes
  DROP CONSTRAINT IF EXISTS vente_lignes_or_investissement_id_fkey,
  ADD CONSTRAINT vente_lignes_or_investissement_id_fkey
    FOREIGN KEY (or_investissement_id) REFERENCES public.or_investissement(id) ON DELETE SET NULL;

-- vente_lignes.fonderie_id → fonderies(id) SET NULL
ALTER TABLE public.vente_lignes
  DROP CONSTRAINT IF EXISTS vente_lignes_fonderie_id_fkey,
  ADD CONSTRAINT vente_lignes_fonderie_id_fkey
    FOREIGN KEY (fonderie_id) REFERENCES public.fonderies(id) ON DELETE SET NULL;

-- vente_lignes.bon_commande_id → bons_commande(id) SET NULL
ALTER TABLE public.vente_lignes
  DROP CONSTRAINT IF EXISTS vente_lignes_bon_commande_id_fkey,
  ADD CONSTRAINT vente_lignes_bon_commande_id_fkey
    FOREIGN KEY (bon_commande_id) REFERENCES public.bons_commande(id) ON DELETE SET NULL;

-- reglements.bon_commande_id → bons_commande(id) SET NULL
ALTER TABLE public.reglements
  DROP CONSTRAINT IF EXISTS reglements_bon_commande_id_fkey,
  ADD CONSTRAINT reglements_bon_commande_id_fkey
    FOREIGN KEY (bon_commande_id) REFERENCES public.bons_commande(id) ON DELETE SET NULL;

-- reglements.client_id → clients(id) SET NULL
ALTER TABLE public.reglements
  DROP CONSTRAINT IF EXISTS reglements_client_id_fkey,
  ADD CONSTRAINT reglements_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- reglements.fonderie_id → fonderies(id) SET NULL
ALTER TABLE public.reglements
  DROP CONSTRAINT IF EXISTS reglements_fonderie_id_fkey,
  ADD CONSTRAINT reglements_fonderie_id_fkey
    FOREIGN KEY (fonderie_id) REFERENCES public.fonderies(id) ON DELETE SET NULL;

-- email_logs.lot_id → lots(id) SET NULL
ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_lot_id_fkey,
  ADD CONSTRAINT email_logs_lot_id_fkey
    FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;

-- email_logs.dossier_id → dossiers(id) SET NULL
ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_dossier_id_fkey,
  ADD CONSTRAINT email_logs_dossier_id_fkey
    FOREIGN KEY (dossier_id) REFERENCES public.dossiers(id) ON DELETE SET NULL;

-- email_logs.client_id → clients(id) SET NULL
ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_client_id_fkey,
  ADD CONSTRAINT email_logs_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- bijoux_stock.depot_vente_lot_id → lots(id) SET NULL
ALTER TABLE public.bijoux_stock
  DROP CONSTRAINT IF EXISTS bijoux_stock_depot_vente_lot_id_fkey,
  ADD CONSTRAINT bijoux_stock_depot_vente_lot_id_fkey
    FOREIGN KEY (depot_vente_lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;

-- bijoux_stock.deposant_client_id → clients(id) SET NULL
ALTER TABLE public.bijoux_stock
  DROP CONSTRAINT IF EXISTS bijoux_stock_deposant_client_id_fkey,
  ADD CONSTRAINT bijoux_stock_deposant_client_id_fkey
    FOREIGN KEY (deposant_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


-- ============================================================
-- PHASE 2C: Missing FK — create new constraint
-- ============================================================

-- lot_references.destination_stock_id → bijoux_stock(id) SET NULL
ALTER TABLE public.lot_references
  ADD CONSTRAINT lot_references_destination_stock_id_fkey
    FOREIGN KEY (destination_stock_id) REFERENCES public.bijoux_stock(id) ON DELETE SET NULL;
