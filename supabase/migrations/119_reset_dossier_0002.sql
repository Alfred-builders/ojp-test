ALTER TABLE public.lots DISABLE TRIGGER USER;
ALTER TABLE public.dossiers DISABLE TRIGGER USER;
UPDATE public.lots SET status = 'brouillon', outcome = NULL, date_finalisation = NULL, date_acceptation = NULL, date_fin_retractation = NULL, total_prix_achat = 0, total_prix_revente = 0, marge_brute = 0, montant_taxe = 0, montant_net = 0
WHERE id = 'd78fc018-c53a-4f4f-ba0a-3af75478aa5e';
UPDATE public.dossiers SET status = 'brouillon'
WHERE id = '22fa4d1f-1d71-4af6-87f0-ceaa5bd53f21';
ALTER TABLE public.lots ENABLE TRIGGER USER;
ALTER TABLE public.dossiers ENABLE TRIGGER USER;
