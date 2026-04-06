import type { DocumentType } from "./document";
import type { AppNotificationType } from "./notification";

// ── Company ──────────────────────────────────────────────────────
export interface CompanySettings {
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  telephone: string;
  email: string;
  forme_juridique: string;
  siret_rcs: string;
  tribunal: string;
  logo_url: string;
  email_expediteur: string;
  nom_expediteur: string;
}

// ── Business Rules ───────────────────────────────────────────────
export interface BusinessRulesSettings {
  retractation_heures: number;
  devis_validite_heures: number;
  acompte_pct: number;
  solde_pct: number;
  solde_delai_heures: number;
  commission_dv_pct: number;
  contrat_dv_duree_mois: number;
  preavis_resiliation_jours: number;
  penalite_retrait_pct: number;
  forfait_nettoyage: number;
  frais_garde_mois: number;
  delai_paiement_deposant_jours: number;
  seuil_alerte_identite_jours: number;
}

// ── Document Prefixes ────────────────────────────────────────────
export type DocumentPrefixesSettings = Record<DocumentType, string>;

// ── Legal Texts ──────────────────────────────────────────────────
export interface CdvClause {
  title: string;
  body: string;
}

export interface LegalTextsSettings {
  conditions_confie: string;
  conditions_achat: string;
  conditions_contrat: string;
  devis_validite: string;
  conditions_quittance_dv: string;
  cgv_vente: string;
  cgv_acompte: string;
  conditions_bon_commande: string;
  cdv_clauses: CdvClause[];
}

// ── PDF Style ────────────────────────────────────────────────────
export interface PdfStyleSettings {
  color_primary: string;
  font_family: string;
}

// ── Notifications ────────────────────────────────────────────────
export interface NotificationsSettings {
  types: Record<AppNotificationType, boolean>;
  cron_lots_finalisables: string;
  cron_acompte_expire: string;
  emails_internes: string[];
}

// ── Appearance ───────────────────────────────────────────────────
export interface AppearanceSettings {
  sidebar_default_open: boolean;
  items_per_page: number;
}

// ── Settings key map ─────────────────────────────────────────────
export interface SettingsMap {
  company: CompanySettings;
  business_rules: BusinessRulesSettings;
  document_prefixes: DocumentPrefixesSettings;
  legal_texts: LegalTextsSettings;
  pdf_style: PdfStyleSettings;
  notifications: NotificationsSettings;
  appearance: AppearanceSettings;
}

export type SettingsKey = keyof SettingsMap;
