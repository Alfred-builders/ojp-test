"use client";

import { Badge } from "@/components/ui/badge";
import type { LotOutcome } from "@/types/lot";

const GREEN = "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30";
const BLUE = "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30";
const RED = "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30";
const GRAY = "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800";

function getConfig(status: string, outcome?: LotOutcome | null): { label: string; className: string } {
  if (status === "brouillon") return { label: "Brouillon", className: GRAY };
  if (status === "en_cours") return { label: "En cours", className: BLUE };
  if (status === "finalise") {
    if (outcome === "refuse") return { label: "Refusé", className: RED };
    if (outcome === "retracte") return { label: "Rétracté", className: RED };
    if (outcome === "annule") return { label: "Annulé", className: RED };
    return { label: "Finalisé", className: GREEN };
  }
  return { label: "Inconnu", className: GRAY };
}

export function LotStatusBadge({ status, outcome }: { status: string; outcome?: LotOutcome | null }) {
  const config = getConfig(status, outcome);
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
