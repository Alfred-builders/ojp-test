-- Reset DOS-2026-0007 et DOS-2026-0008 à l'état brouillon
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- ============================================================
-- DOS-2026-0007 (VEN-2026-0004)
-- ============================================================

-- Supprimer règlements
DELETE FROM public.reglements
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0004');

-- Supprimer document_references + documents
DELETE FROM public.document_references
WHERE document_id IN (
  SELECT id FROM public.documents
  WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0004')
);
DELETE FROM public.documents
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0004');

-- Supprimer vente_lignes
DELETE FROM public.vente_lignes
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0004');

-- Supprimer bons de commande liés
DELETE FROM public.bons_commande
WHERE id IN ('38788f06-2df1-4e34-9efa-6a4fbf07fc17', '2f44fb85-a02c-49ee-9609-af26e9d1cf4d');

-- Reset lot
UPDATE public.lots
SET status = 'brouillon',
    date_acceptation = NULL,
    date_fin_retractation = NULL,
    date_finalisation = NULL,
    acompte_montant = NULL,
    acompte_paye = false,
    date_acompte = NULL,
    date_limite_solde = NULL,
    solde_paye = false,
    date_solde = NULL,
    date_livraison = NULL,
    date_reglement = NULL,
    mode_reglement = NULL,
    numero_facture = NULL
WHERE numero = 'VEN-2026-0004';

-- Reset dossier
UPDATE public.dossiers
SET status = 'brouillon'
WHERE numero = 'DOS-2026-0007';

-- ============================================================
-- DOS-2026-0008 (RAC-2026-0003)
-- ============================================================

-- Supprimer règlements (déjà supprimés mais par sécurité)
DELETE FROM public.reglements
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003');

-- Supprimer document_references + documents
DELETE FROM public.document_references
WHERE document_id IN (
  SELECT id FROM public.documents
  WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003')
);
DELETE FROM public.documents
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003');

-- Supprimer bijoux_stock restants liés
DELETE FROM public.bijoux_stock
WHERE id IN (
  SELECT destination_stock_id FROM public.lot_references
  WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003')
  AND destination_stock_id IS NOT NULL
);

-- Reset lot_references
UPDATE public.lot_references
SET status = 'devis_envoye',
    destination_stock_id = NULL,
    date_envoi = NULL,
    date_fin_delai = NULL
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003');

-- Reset lot
UPDATE public.lots
SET status = 'brouillon',
    date_acceptation = NULL,
    date_fin_retractation = NULL,
    date_finalisation = NULL
WHERE numero = 'RAC-2026-0003';

-- Reset dossier
UPDATE public.dossiers
SET status = 'brouillon'
WHERE numero = 'DOS-2026-0008';

ALTER TABLE public.lots ENABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers ENABLE TRIGGER validate_dossier_status_transition_trigger;
