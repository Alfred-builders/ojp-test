ALTER TABLE public.lots DISABLE TRIGGER USER;
ALTER TABLE public.dossiers DISABLE TRIGGER USER;

-- Reset DPV lot
UPDATE public.lots SET status = 'brouillon', outcome = NULL, date_finalisation = NULL
WHERE id = '2a5ddd27-c32a-4624-9b23-9350aa7db7c2';

-- Reset vente lot
UPDATE public.lots SET status = 'brouillon', outcome = NULL, date_finalisation = NULL, acompte_montant = NULL, date_limite_solde = NULL, solde_paye = NULL, date_solde = NULL, date_reglement = NULL, mode_reglement = NULL
WHERE id = '3b404820-63f9-4306-b884-1f0e1811757d';

-- Reset dossiers
UPDATE public.dossiers SET status = 'brouillon' WHERE id = '9bde1376-79a3-4aab-b077-d0ec2815e985';
UPDATE public.dossiers SET status = 'brouillon' WHERE id = 'e5d077e2-bd61-4a02-b6b5-92ab6bfdfe70';

ALTER TABLE public.lots ENABLE TRIGGER USER;
ALTER TABLE public.dossiers ENABLE TRIGGER USER;
