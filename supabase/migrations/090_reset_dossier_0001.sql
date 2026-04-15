-- Temporary migration: reset dossier DOS-2026-0001 to brouillon for testing

-- Disable user triggers temporarily
ALTER TABLE public.lots DISABLE TRIGGER USER;
ALTER TABLE public.dossiers DISABLE TRIGGER USER;

-- Reset lot to brouillon
UPDATE public.lots
SET status = 'brouillon', outcome = NULL, date_finalisation = NULL,
    date_acceptation = NULL, date_fin_retractation = NULL
WHERE id = 'f2b8b229-aa43-420e-acf6-687eeee94f16';

-- Reset dossier to brouillon
UPDATE public.dossiers
SET status = 'brouillon'
WHERE id = '886fb68a-58c9-438f-9d53-07b657f3f2a7';

-- Re-enable user triggers
ALTER TABLE public.lots ENABLE TRIGGER USER;
ALTER TABLE public.dossiers ENABLE TRIGGER USER;
