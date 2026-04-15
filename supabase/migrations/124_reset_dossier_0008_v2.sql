-- Reset DOS-2026-0008 à brouillon (v2)
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- Supprimer reglements
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

-- Supprimer bijoux_stock
DELETE FROM public.bijoux_stock
WHERE id IN ('aa478459-6d63-441a-ad0c-544a35a0af4f', '52eb7443-a1a2-479a-b584-7926e1854fa7');

-- Décrementer or_investissement (2 refs de qty 1)
UPDATE public.or_investissement
SET quantite = GREATEST(quantite - 2, 0)
WHERE id = '7b9fe0b1-586f-464c-afc5-3aa7b44ec690';

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
