import type { LotWithReferences, LotReference } from "@/types/lot";
import type { DossierWithClient } from "@/types/dossier";

// ── Action IDs ──────────────────────────────────────────────

export type LotActionId =
  // Lot-level status transitions
  | "lot.accepter_devis"
  | "lot.refuser_devis"
  | "lot.finaliser_rachat"
  | "lot.retracter"
  // Dossier-level
  | "lot.finaliser_dossier";

export type RefActionId =
  // Reference-level actions
  | "ref.valider_rachat"
  | "ref.retracter"
  | "ref.accepter_devis"
  | "ref.refuser_devis"
  | "ref.restituer";

export type ActionId = LotActionId | RefActionId;

// ── Action metadata ─────────────────────────────────────────

export type ActionCategory = "transition" | "document" | "stock" | "notification";
export type ActionPriority = "urgent" | "normal" | "info";
export type ActionVariant = "default" | "destructive" | "secondary";

export interface LotAction {
  id: ActionId;
  label: string;
  description: string;
  category: ActionCategory;
  priority: ActionPriority;
  icon: string;
  variant: ActionVariant;
  disabled?: boolean;
  disabledReason?: string;
  scope: "lot" | "reference";
  referenceId?: string;
  referenceDesignation?: string;
}

// ── Execution context ───────────────────────────────────────

export type SupabaseClient = ReturnType<typeof import("@/lib/supabase/client").createClient>;

export interface ActionContext {
  lot: LotWithReferences;
  dossier: {
    id: string;
    numero: string;
    client: {
      id: string;
      civility: string;
      first_name: string;
      last_name: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      postal_code?: string | null;
      city?: string | null;
      is_valid?: boolean;
    };
  };
  retractationMs: number;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

// ── Dossier-level context ───────────────────────────────────

export interface DossierActionContext {
  dossier: DossierWithClient;
  brouillonLots: import("@/types/lot").Lot[];
  supabase: SupabaseClient;
}

// ── Helper type: lot with dossier (as used in lot-detail-page) ──

export interface LotWithDossierClient extends LotWithReferences {
  dossier: {
    id: string;
    numero: string;
    client: {
      id: string;
      civility: string;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      city: string | null;
      is_valid: boolean;
    };
  };
}
