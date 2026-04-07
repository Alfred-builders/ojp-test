-- Temporary migration to reset test data
-- Disable user-defined triggers to bypass status transition validation
ALTER TABLE lots DISABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE dossiers DISABLE TRIGGER validate_dossier_status_transition_trigger;

-- Clean up documents and payments
DELETE FROM document_references;
DELETE FROM documents;
DELETE FROM reglements;

-- Reset lot_references to initial status (en_expertise)
UPDATE lot_references SET status = 'en_expertise', date_envoi = NULL, date_fin_delai = NULL;

-- Reset all lots to brouillon
UPDATE lots SET status = 'brouillon', acompte_montant = NULL, date_limite_solde = NULL;

-- Reset all dossiers to brouillon
UPDATE dossiers SET status = 'brouillon';

-- Re-enable triggers
ALTER TABLE lots ENABLE TRIGGER validate_lot_status_transition_trigger;
ALTER TABLE dossiers ENABLE TRIGGER validate_dossier_status_transition_trigger;
