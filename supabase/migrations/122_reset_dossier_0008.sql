-- Reset dossier DOS-2026-0008 pour tester le nouveau flux fonderie par défaut
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- Supprimer document_references puis documents
DELETE FROM public.document_references
WHERE document_id IN (
  SELECT id FROM public.documents
  WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003')
);

DELETE FROM public.documents
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003');

-- Reset lot_references
UPDATE public.lot_references
SET status = 'devis_envoye',
    destination_stock_id = NULL,
    date_envoi = NULL,
    date_fin_delai = NULL
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003');

-- Reset lot
UPDATE public.lots
SET status = 'en_cours',
    date_acceptation = NULL,
    date_fin_retractation = NULL,
    date_finalisation = NULL
WHERE numero = 'RAC-2026-0003';

-- Reset dossier
UPDATE public.dossiers
SET status = 'en_cours'
WHERE numero = 'DOS-2026-0008';

ALTER TABLE public.lots ENABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers ENABLE TRIGGER validate_dossier_status_transition_trigger;
