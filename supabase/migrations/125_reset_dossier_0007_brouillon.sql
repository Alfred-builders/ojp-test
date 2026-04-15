-- Reset DOS-2026-0007 à brouillon complet
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- Supprimer reglements
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

-- Supprimer toutes les vente_lignes (y compris celles splittées)
DELETE FROM public.vente_lignes
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0004');

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

ALTER TABLE public.lots ENABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers ENABLE TRIGGER validate_dossier_status_transition_trigger;
