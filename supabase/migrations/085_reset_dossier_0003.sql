-- Reset dossier DOS-2026-0003 (dépôt-vente) pour tests
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

UPDATE public.dossiers SET status = 'brouillon' WHERE numero = 'DOS-2026-0003';

UPDATE public.lots SET status = 'brouillon', outcome = NULL, date_finalisation = NULL
WHERE dossier_id = (SELECT id FROM public.dossiers WHERE numero = 'DOS-2026-0003');

UPDATE public.lot_references SET status = 'en_expertise', date_envoi = NULL, date_fin_delai = NULL
WHERE lot_id IN (SELECT id FROM public.lots WHERE dossier_id = (SELECT id FROM public.dossiers WHERE numero = 'DOS-2026-0003'));

-- Supprimer les entrées stock créées + documents
DELETE FROM public.bijoux_stock WHERE depot_vente_lot_id IN (SELECT id FROM public.lots WHERE dossier_id = (SELECT id FROM public.dossiers WHERE numero = 'DOS-2026-0003'));
DELETE FROM public.document_references WHERE document_id IN (SELECT id FROM public.documents WHERE dossier_id = (SELECT id FROM public.dossiers WHERE numero = 'DOS-2026-0003'));
DELETE FROM public.documents WHERE dossier_id = (SELECT id FROM public.dossiers WHERE numero = 'DOS-2026-0003');

ALTER TABLE public.lots ENABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers ENABLE TRIGGER validate_dossier_status_transition_trigger;
