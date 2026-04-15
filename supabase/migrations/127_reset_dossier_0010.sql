-- Reset DOS-2026-0010 à brouillon
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- Supprimer reglements
DELETE FROM public.reglements WHERE lot_id = 'c30d88d9-e884-4ffc-b85c-d8433c087060';

-- Supprimer document_references + documents
DELETE FROM public.document_references WHERE document_id IN (SELECT id FROM public.documents WHERE lot_id = 'c30d88d9-e884-4ffc-b85c-d8433c087060');
DELETE FROM public.documents WHERE lot_id = 'c30d88d9-e884-4ffc-b85c-d8433c087060';

-- Supprimer BDC lignes liées puis BDC
DELETE FROM public.vente_lignes WHERE lot_id = 'c30d88d9-e884-4ffc-b85c-d8433c087060';

-- BDC-2026-0002: supprimer le doc lié puis le BDC
DELETE FROM public.documents WHERE bon_livraison_id IS NULL AND id IN (SELECT id FROM public.documents WHERE type = 'bon_commande' AND storage_path LIKE '%CMDF-2026-0002%');
DELETE FROM public.bons_commande WHERE id = '8f28a167-2816-4d67-ab85-93d9fec5a9ac';

-- Remettre le bijou bracelet en stock (était réservé)
UPDATE public.bijoux_stock SET statut = 'en_stock' WHERE id = 'cca3d4bb-60c2-477b-ab65-c64a1ec4e137';

-- Restaurer les quantités or investissement
-- 10 Roubles: 3 servis du stock → +3
UPDATE public.or_investissement SET quantite = quantite + 3 WHERE id = '4f0dc985-7100-4976-a911-b0093a0c7f9a';
-- 100F liberté: 4 commandées et reçues (pas de stock décrémenté, la fonderie a livré)

-- Reset lot
UPDATE public.lots
SET status = 'brouillon',
    date_acceptation = NULL, date_fin_retractation = NULL, date_finalisation = NULL,
    acompte_montant = NULL, acompte_paye = false, date_acompte = NULL,
    date_limite_solde = NULL, solde_paye = false, date_solde = NULL,
    date_livraison = NULL, date_reglement = NULL, mode_reglement = NULL, numero_facture = NULL
WHERE id = 'c30d88d9-e884-4ffc-b85c-d8433c087060';

-- Reset dossier
UPDATE public.dossiers SET status = 'brouillon' WHERE id = '6d3d92fc-738f-4052-a7ce-8c2bcaccb2ab';

ALTER TABLE public.lots ENABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers ENABLE TRIGGER validate_dossier_status_transition_trigger;
