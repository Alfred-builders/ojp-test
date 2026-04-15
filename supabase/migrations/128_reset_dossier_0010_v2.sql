-- Reset DOS-2026-0010 à brouillon (v2)
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- Supprimer reglements
DELETE FROM public.reglements WHERE lot_id = 'c30d88d9-e884-4ffc-b85c-d8433c087060';

-- Supprimer document_references + documents
DELETE FROM public.document_references WHERE document_id IN (SELECT id FROM public.documents WHERE lot_id = 'c30d88d9-e884-4ffc-b85c-d8433c087060');
DELETE FROM public.documents WHERE lot_id = 'c30d88d9-e884-4ffc-b85c-d8433c087060';

-- Supprimer vente_lignes
DELETE FROM public.vente_lignes WHERE lot_id = 'c30d88d9-e884-4ffc-b85c-d8433c087060';

-- Supprimer BDC 2712c664 : doc lié puis BDC
DELETE FROM public.documents WHERE type = 'bon_commande' AND id IN (SELECT id FROM public.documents WHERE storage_path LIKE '%CMDF-2026-0002%');
DELETE FROM public.bons_commande WHERE id = '2712c664-fac8-4bd3-9af3-0fc166ee4de7';

-- Remettre bijou bracelet en stock
UPDATE public.bijoux_stock SET statut = 'en_stock' WHERE id = 'cca3d4bb-60c2-477b-ab65-c64a1ec4e137';

-- Restaurer or invest: 100 Francs Commémoration argent → +5 (servi_stock)
UPDATE public.or_investissement SET quantite = quantite + 5 WHERE id = 'f4f71405-b803-45b0-bf1b-292a6a3d305f';

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
