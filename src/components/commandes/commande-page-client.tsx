"use client";

import { useState } from "react";
import { Rows, SquaresFour } from "@phosphor-icons/react";
import { CommandeTable } from "@/components/commandes/commande-table";
import { CommandeRefTable } from "@/components/commandes/commande-ref-table";
import type { LotWithDossier } from "@/types/lot";
import type { CommandeLigneFlat } from "@/app/(dashboard)/commandes/page";

interface CommandePageClientProps {
  lots: LotWithDossier[];
  lignes: CommandeLigneFlat[];
}

export function CommandePageClient({ lots, lignes }: CommandePageClientProps) {
  const [view, setView] = useState<"dossier" | "reference">("dossier");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => setView("dossier")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "dossier"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SquaresFour size={14} weight="duotone" />
            Par dossier
          </button>
          <button
            onClick={() => setView("reference")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "reference"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Rows size={14} weight="duotone" />
            Par référence
          </button>
        </div>
      </div>

      {view === "dossier" ? (
        <CommandeTable data={lots} />
      ) : (
        <CommandeRefTable data={lignes} />
      )}
    </div>
  );
}
