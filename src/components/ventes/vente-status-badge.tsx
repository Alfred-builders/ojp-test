"use client";

import { Badge } from "@/components/ui/badge";
import type { VenteStatus } from "@/types/vente";

const STATUS_CONFIG: Record<VenteStatus, { label: string; className: string }> = {
  brouillon: {
    label: "Brouillon",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800",
  },
  en_cours: {
    label: "En cours",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30",
  },
  livre: {
    label: "Livré",
    className: "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/30",
  },
  a_regler: {
    label: "À régler",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/30",
  },
  termine: {
    label: "Terminé",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
  },
  annule: {
    label: "Annulé",
    className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30",
  },
  pret: {
    label: "Prêt",
    className: "bg-cyan-100 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/30",
  },
  finalise: {
    label: "Finalisé",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
  },
};

export function VenteStatusBadge({ status }: { status: VenteStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
