/**
 * Shared Supabase select fragments to avoid duplication across pages.
 */

/** Dossier with nested client info (civility, name) */
export const DOSSIER_WITH_CLIENT = "dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name))";

/** All columns + dossier with client */
export const ALL_WITH_DOSSIER_CLIENT = `*, ${DOSSIER_WITH_CLIENT}`;
