ALTER TABLE public.lots DISABLE TRIGGER USER;
ALTER TABLE public.dossiers DISABLE TRIGGER USER;

UPDATE public.lots
SET status = 'brouillon', outcome = NULL, date_finalisation = NULL,
    date_acceptation = NULL, date_fin_retractation = NULL
WHERE id = 'f2b8b229-aa43-420e-acf6-687eeee94f16';

UPDATE public.dossiers SET status = 'brouillon'
WHERE id = '886fb68a-58c9-438f-9d53-07b657f3f2a7';

ALTER TABLE public.lots ENABLE TRIGGER USER;
ALTER TABLE public.dossiers ENABLE TRIGGER USER;
