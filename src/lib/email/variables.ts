import type { EmailNotificationType } from "@/types/email";
import { formatDate } from "@/lib/format";

/**
 * Replaces {{variable}} placeholders in a template string.
 * Unreplaced variables are left as-is.
 */
export function replaceVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

/**
 * Test data for "Envoyer un test" button.
 */
export const TEST_VARIABLES: Record<string, string> = {
  client_civilite: "M.",
  client_nom: "Dupont",
  client_prenom: "Jean",
  client_email: "jean.dupont@example.com",
  dossier_numero: "DOS-2026-00001",
  lot_numero: "DOS-2026-00001-LOT1",
  devis_numero: "DEV-2026-0001",
  contrat_numero: "CRA-2026-0001",
  quittance_numero: "QRA-2026-0001",
  facture_numero: "FVE-2026-0001",
  montant_total: "1 250,00",
  montant_ttc: "1 250,00",
  montant_acompte: "125,00",
  montant_net: "750,00",
  montant_commission: "500,00",
  mode_reglement: "Virement bancaire",
  date_limite_solde: "07/04/2026",
  date: formatDate(new Date().toISOString()),
};

/**
 * Build the variables map from database entities for a given notification type.
 */
export function buildVariablesMap(
  notificationType: EmailNotificationType,
  data: {
    client?: {
      civility?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    };
    dossier?: { numero?: string | null };
    lot?: {
      numero?: string | null;
      total_prix_achat?: number | null;
      total_prix_revente?: number | null;
      acompte_montant?: number | null;
      date_limite_solde?: string | null;
      mode_reglement?: string | null;
    };
    documents?: Array<{ type: string; numero: string }>;
    extra?: Record<string, string>;
  }
): Record<string, string> {
  const fmt = (n?: number | null) =>
    n != null
      ? n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";

  const fmtDate = (d?: string | null) => {
    if (!d) return "";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return formatDate(date.toISOString());
    } catch {
      return d;
    }
  };

  const vars: Record<string, string> = {
    client_civilite: data.client?.civility === "M" ? "M." : data.client?.civility === "F" ? "Mme" : (data.client?.civility ?? ""),
    client_nom: data.client?.last_name ?? "",
    client_prenom: data.client?.first_name ?? "",
    client_email: data.client?.email ?? "",
    dossier_numero: data.dossier?.numero ?? "",
    lot_numero: data.lot?.numero ?? "",
    date: formatDate(new Date().toISOString()),
  };

  // Document-specific variables
  const docs = data.documents ?? [];
  const findDoc = (type: string) => docs.find((d) => d.type === type)?.numero ?? "";

  switch (notificationType) {
    case "devis_envoye":
      vars.devis_numero = findDoc("devis_rachat");
      vars.montant_total = fmt(data.lot?.total_prix_achat);
      break;
    case "contrat_rachat_finalise":
      vars.contrat_numero = findDoc("contrat_rachat");
      vars.quittance_numero = findDoc("quittance_rachat");
      vars.montant_total = fmt(data.lot?.total_prix_achat);
      break;
    case "contrat_depot_vente":
      break;
    case "facture_acompte":
      vars.facture_numero = findDoc("facture_acompte");
      vars.montant_acompte = fmt(data.lot?.acompte_montant);
      vars.date_limite_solde = fmtDate(data.lot?.date_limite_solde);
      break;
    case "facture_vente":
      vars.facture_numero = findDoc("facture_vente");
      vars.montant_ttc = fmt(data.lot?.total_prix_revente);
      vars.mode_reglement = data.lot?.mode_reglement ?? "";
      break;
    case "quittance_depot_vente":
      vars.quittance_numero = findDoc("quittance_depot_vente");
      vars.montant_net = data.extra?.montant_net ?? "";
      vars.montant_commission = data.extra?.montant_commission ?? "";
      break;
    case "interne_devis_accepte":
    case "interne_retractation":
    case "interne_lot_finalisable":
      vars.montant_total = fmt(data.lot?.total_prix_achat);
      break;
    case "interne_acompte_expire":
      vars.montant_acompte = fmt(data.lot?.acompte_montant);
      vars.date_limite_solde = fmtDate(data.lot?.date_limite_solde);
      break;
  }

  // Merge extra variables
  if (data.extra) {
    Object.assign(vars, data.extra);
  }

  return vars;
}
