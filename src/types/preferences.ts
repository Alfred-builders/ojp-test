export interface UserPreferences {
  id: string;
  user_id: string;
  theme: "light" | "dark" | "system";
  sidebar_default_open: boolean;
  items_per_page: number;
  notif_in_app: boolean;
  notif_email_digest: boolean;
}
