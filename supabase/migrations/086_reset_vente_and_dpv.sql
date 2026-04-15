-- Reset le lot de vente VEN-2026-0003 et le DPV pour tester
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- Reset le dossier vente qui contient VEN-2026-0003
UPDATE public.dossiers SET status = 'brouillon'
WHERE id = (SELECT dossier_id FROM public.lots WHERE numero = 'VEN-2026-0003');

-- Reset le lot vente
UPDATE public.lots SET status = 'brouillon', outcome = NULL, date_finalisation = NULL
WHERE numero = 'VEN-2026-0003';

-- Supprimer les reglements liés aux documents du lot vente
DELETE FROM public.reglements WHERE document_id IN (SELECT id FROM public.documents WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0003'));

-- Supprimer les document_references puis documents du lot vente
DELETE FROM public.document_references WHERE document_id IN (SELECT id FROM public.documents WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0003'));
DELETE FROM public.documents WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0003');

-- Remettre le bijou DPV en "en_depot_vente" (au lieu de "reserve")
UPDATE public.bijoux_stock SET statut = 'en_depot_vente'
WHERE depot_vente_lot_id = (SELECT id FROM public.lots WHERE numero = 'DPV-2026-0001');

-- Remettre la ref DPV en "en_depot_vente"
UPDATE public.lot_references SET status = 'en_depot_vente'
WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'DPV-2026-0001')
AND status != 'en_depot_vente';

ALTER TABLE public.lots ENABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers ENABLE TRIGGER validate_dossier_status_transition_trigger;
