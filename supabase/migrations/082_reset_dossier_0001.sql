-- ============================================================
-- Migration 082: Reset dossier DOS-2026-0001 pour tests
-- Désactiver temporairement les triggers, reset, réactiver
-- ============================================================

-- Désactiver les triggers de validation
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- Reset dossier
UPDATE public.dossiers SET status = 'brouillon' WHERE numero = 'DOS-2026-0001';

-- Reset lots du dossier
UPDATE public.lots SET status = 'brouillon', outcome = NULL, date_acceptation = NULL, date_fin_retractation = NULL, date_finalisation = NULL
WHERE dossier_id = (SELECT id FROM public.dossiers WHERE numero = 'DOS-2026-0001');

-- Reset refs des lots du dossier
UPDATE public.lot_references SET status = 'en_expertise', date_envoi = NULL, date_fin_delai = NULL
WHERE lot_id IN (SELECT id FROM public.lots WHERE dossier_id = (SELECT id FROM public.dossiers WHERE numero = 'DOS-2026-0001'));

-- Supprimer les documents générés
DELETE FROM public.documents WHERE dossier_id = (SELECT id FROM public.dossiers WHERE numero = 'DOS-2026-0001');

-- Réactiver les triggers
ALTER TABLE public.lots ENABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers ENABLE TRIGGER validate_dossier_status_transition_trigger;
