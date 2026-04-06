-- ============================================================
-- Migration 026: Per-line delivery tracking + acompte mechanism
-- ============================================================

-- 1. Add is_livre flag to vente_lignes for per-line delivery tracking
ALTER TABLE public.vente_lignes
  ADD COLUMN IF NOT EXISTS is_livre BOOLEAN DEFAULT false;

-- 2. Add acompte tracking fields to lots (for or investissement sales)
ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS acompte_montant NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS acompte_paye BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_acompte TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_limite_solde TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS solde_paye BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_solde TIMESTAMPTZ;

-- 3. Add facture_acompte document type
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    'quittance_rachat', 'contrat_rachat', 'devis_rachat',
    'contrat_depot_vente', 'confie_achat',
    'quittance_depot_vente', 'facture_vente', 'facture_acompte'
  ));
