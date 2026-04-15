ALTER TABLE public.lots DISABLE TRIGGER USER;
ALTER TABLE public.dossiers DISABLE TRIGGER USER;

UPDATE public.lots SET status = 'brouillon', outcome = NULL, date_finalisation = NULL, date_acceptation = NULL, date_fin_retractation = NULL, acompte_montant = NULL, date_limite_solde = NULL, solde_paye = NULL, date_solde = NULL, date_reglement = NULL, mode_reglement = NULL
WHERE id IN ('2a5ddd27-c32a-4624-9b23-9350aa7db7c2', '3b404820-63f9-4306-b884-1f0e1811757d', 'da0ee699-4aec-401d-b102-1fa07ee22e8d');

UPDATE public.dossiers SET status = 'brouillon'
WHERE id IN ('9bde1376-79a3-4aab-b077-d0ec2815e985', 'e5d077e2-bd61-4a02-b6b5-92ab6bfdfe70', '4a36fe3f-2975-4be1-abae-5142230c1ddf');

ALTER TABLE public.lots ENABLE TRIGGER USER;
ALTER TABLE public.dossiers ENABLE TRIGGER USER;
