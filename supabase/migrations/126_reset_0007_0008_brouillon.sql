-- Reset DOS-2026-0007 et DOS-2026-0008 à brouillon
ALTER TABLE public.lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- ============================================================
-- DOS-2026-0008 (RAC-2026-0003)
-- ============================================================
DELETE FROM public.reglements WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003');
DELETE FROM public.document_references WHERE document_id IN (SELECT id FROM public.documents WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003'));
DELETE FROM public.documents WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003');
-- Supprimer BDL lignes + BDL + documents BDL liés à ces bijoux
DELETE FROM public.bon_livraison_lignes WHERE bijoux_stock_id IN ('9351a64a-a332-469f-91aa-418b5a8c64d5', '0c5183b6-32ff-4455-bb78-cdf63a45c5a4');
-- Supprimer les BDL vides (sans lignes)
DELETE FROM public.documents WHERE bon_livraison_id IN (SELECT id FROM public.bons_livraison WHERE id NOT IN (SELECT DISTINCT bon_livraison_id FROM public.bon_livraison_lignes));
DELETE FROM public.bons_livraison WHERE id NOT IN (SELECT DISTINCT bon_livraison_id FROM public.bon_livraison_lignes);
DELETE FROM public.bijoux_stock WHERE id IN ('9351a64a-a332-469f-91aa-418b5a8c64d5', '0c5183b6-32ff-4455-bb78-cdf63a45c5a4');
UPDATE public.or_investissement SET quantite = GREATEST(quantite - 2, 0) WHERE id = '7b9fe0b1-586f-464c-afc5-3aa7b44ec690';
UPDATE public.lot_references SET status = 'en_expertise', destination_stock_id = NULL, date_envoi = NULL, date_fin_delai = NULL WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'RAC-2026-0003');
UPDATE public.lots SET status = 'brouillon', date_acceptation = NULL, date_fin_retractation = NULL, date_finalisation = NULL WHERE numero = 'RAC-2026-0003';
UPDATE public.dossiers SET status = 'brouillon' WHERE numero = 'DOS-2026-0008';

-- ============================================================
-- DOS-2026-0007 (VEN-2026-0004)
-- ============================================================
DELETE FROM public.reglements WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0004');
DELETE FROM public.document_references WHERE document_id IN (SELECT id FROM public.documents WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0004'));
DELETE FROM public.documents WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0004');
DELETE FROM public.vente_lignes WHERE lot_id = (SELECT id FROM public.lots WHERE numero = 'VEN-2026-0004');
UPDATE public.lots SET status = 'brouillon', date_acceptation = NULL, date_fin_retractation = NULL, date_finalisation = NULL, acompte_montant = NULL, acompte_paye = false, date_acompte = NULL, date_limite_solde = NULL, solde_paye = false, date_solde = NULL, date_livraison = NULL, date_reglement = NULL, mode_reglement = NULL, numero_facture = NULL WHERE numero = 'VEN-2026-0004';
UPDATE public.dossiers SET status = 'brouillon' WHERE numero = 'DOS-2026-0007';

ALTER TABLE public.lots ENABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE public.dossiers ENABLE TRIGGER validate_dossier_status_transition_trigger;
