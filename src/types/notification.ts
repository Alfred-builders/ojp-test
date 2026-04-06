export type AppNotificationType =
  | "dossier_created"
  | "dossier_finalized"
  | "lot_accepted"
  | "lot_finalized"
  | "lot_retracted"
  | "vente_created"
  | "vente_finalized"
  | "vente_livree"
  | "commande_received"
  | "client_created"
  | "system";

export type NotificationEntityType =
  | "dossier"
  | "lot"
  | "vente"
  | "commande"
  | "client";

export interface Notification {
  id: string;
  user_id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  entity_type: NotificationEntityType | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}
