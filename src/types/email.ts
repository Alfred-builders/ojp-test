export type EmailNotificationType =
  | "devis_envoye"
  | "contrat_rachat_finalise"
  | "contrat_depot_vente"
  | "facture_acompte"
  | "facture_vente"
  | "quittance_depot_vente"
  | "interne_devis_accepte"
  | "interne_retractation"
  | "interne_lot_finalisable"
  | "interne_acompte_expire";

export type EmailCategory = "client" | "interne";

export interface EmailTemplateVariable {
  key: string;
  description: string;
}

export interface EmailTemplate {
  id: string;
  notification_type: EmailNotificationType;
  label: string;
  subject: string;
  body: string;
  is_active: boolean;
  category: EmailCategory;
  available_variables: EmailTemplateVariable[];
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  notification_type: EmailNotificationType;
  recipient_email: string;
  subject: string;
  resend_id: string | null;
  status: "sent" | "failed";
  error_message: string | null;
  lot_id: string | null;
  dossier_id: string | null;
  client_id: string | null;
  created_at: string;
}

export interface SendEmailRequest {
  notification_type: EmailNotificationType;
  lot_id?: string;
  dossier_id?: string;
  client_id?: string;
  attachment_paths?: string[];
  extra_variables?: Record<string, string>;
  test?: boolean;
}
