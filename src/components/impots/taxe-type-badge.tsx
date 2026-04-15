"use client";

import { Badge } from "@/components/ui/badge";
import type { TaxeType } from "@/types/impots";

const TYPE_CONFIG: Record<TaxeType, { label: string; className: string }> = {
  TMP: {
    label: "TMP",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/30",
  },
  TPV: {
    label: "TPV",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30",
  },
  TFOP: {
    label: "TFOP",
    className: "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/30",
  },
  TVA: {
    label: "TVA",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
  },
};

export function TaxeTypeBadge({ type }: { type: TaxeType }) {
  const config = TYPE_CONFIG[type];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
