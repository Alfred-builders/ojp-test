/**
 * Shared Supabase select fragments to avoid duplication across pages.
 */

/** Dossier with nested client info (civility, name) */
export const DOSSIER_WITH_CLIENT = "dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name))";

/** All columns + dossier with client */
export const ALL_WITH_DOSSIER_CLIENT = `*, ${DOSSIER_WITH_CLIENT}`;

/** Lot reference with tax data + lot → dossier → client chain */
export const LOT_REF_WITH_TAX_DATA = `id, designation, prix_achat, regime_fiscal, montant_taxe, tmp_montant, tpv_montant, created_at, lot:lots!inner(id, numero, status, date_finalisation, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name)))`;

/** Facture with lot → dossier → client chain */
export const FACTURE_WITH_TAX_DATA = `id, numero, montant_ht, montant_taxe, montant_ttc, date_emission, lot:lots(id, numero, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name)))`;
