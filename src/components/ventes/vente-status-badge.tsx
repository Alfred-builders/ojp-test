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
  termine: {
    label: "Terminé",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
  },
  annule: {
    label: "Annulé",
    className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30",
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
