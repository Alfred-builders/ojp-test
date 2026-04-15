export type UserRole = "super_admin" | "proprietaire" | "vendeur";
export type UserStatus = "pending" | "active" | "inactive" | "deleted";

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export const OWNER_ONLY_ROUTES = [
  "/fonderies",
  "/commandes",
  "/fonderie/routage",
  "/fonderie/suivi",
  "/parametres",
  "/utilisateurs",
];

export const OWNER_ONLY_PREFIXES = [
  "/fonderies/",
  "/commandes/",
  "/fonderie/",
  "/parametres/",
  "/utilisateurs/",
  "/api/email/",
  "/api/users/",
];
