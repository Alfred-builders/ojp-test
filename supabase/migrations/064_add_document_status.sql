-- ============================================================
-- Add status column to documents for tracking document lifecycle
-- ============================================================

-- Possible statuses:
-- en_attente  : default for devis, contrats, factures
-- accepte     : devis accepted
-- refuse      : devis refused
-- signe       : contrat signed
-- regle       : facture paid
-- emis        : quittance/bon issued (terminal)

ALTER TABLE public.documents
  ADD COLUMN status TEXT NOT NULL DEFAULT 'en_attente'
  CHECK (status IN ('en_attente', 'accepte', 'refuse', 'signe', 'regle', 'emis'));

-- Set existing quittances and bons to 'emis' (they're always final)
UPDATE public.documents
  SET status = 'emis'
  WHERE type IN ('quittance_rachat', 'quittance_depot_vente', 'bon_commande', 'bon_livraison');

-- Set devis status based on parent lot status
-- If lot is en_retractation/accepte/finalise → devis was accepted
UPDATE public.documents d
  SET status = 'accepte'
  FROM lots l
  WHERE d.lot_id = l.id
    AND d.type = 'devis_rachat'
    AND l.status IN ('en_retractation', 'finalise', 'accepte');

-- If lot is refuse → devis was refused
UPDATE public.documents d
  SET status = 'refuse'
  FROM lots l
  WHERE d.lot_id = l.id
    AND d.type = 'devis_rachat'
    AND l.status = 'refuse';

-- Set contrats to 'signe' if lot is past brouillon
UPDATE public.documents d
  SET status = 'signe'
  FROM lots l
  WHERE d.lot_id = l.id
    AND d.type IN ('contrat_rachat', 'contrat_depot_vente', 'confie_achat')
    AND l.status NOT IN ('brouillon');

-- Set factures to 'regle' if acompte/solde is paid
UPDATE public.documents d
  SET status = 'regle'
  FROM lots l
  WHERE d.lot_id = l.id
    AND d.type = 'facture_acompte'
    AND l.acompte_paye = true;

UPDATE public.documents d
  SET status = 'regle'
  FROM lots l
  WHERE d.lot_id = l.id
    AND d.type = 'facture_solde'
    AND l.solde_paye = true;

UPDATE public.documents d
  SET status = 'regle'
  FROM lots l
  WHERE d.lot_id = l.id
    AND d.type = 'facture_vente'
    AND l.status = 'termine';
