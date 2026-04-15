"use client";

import { useState, useCallback } from "react";
import { CommandeRefTable } from "@/components/commandes/commande-ref-table";
import { BonsCommandeList } from "@/components/commandes/bons-commande-list";
import { Button } from "@/components/ui/button";
import type { CommandeLigneFlat } from "@/types/commande";
import type { BonCommande } from "@/types/bon-commande";
import type { Reglement } from "@/types/reglement";
import type { Fonderie } from "@/types/fonderie";

interface CommandePageClientProps {
  lignes: CommandeLigneFlat[];
  bonsCommande?: BonCommande[];
  reglements?: Reglement[];
  ungroupedByFonderie?: Array<{
    fonderie_id: string;
    fonderie_nom: string;
    ligne_ids: string[];
    total: number;
    count: number;
  }>;
  fonderies?: Fonderie[];
}

export function CommandePageClient({
  lignes,
  bonsCommande = [],
  reglements = [],
  ungroupedByFonderie = [],
  fonderies = [],
}: CommandePageClientProps) {
  const [generateFn, setGenerateFn] = useState<(() => void) | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bdcCount, setBdcCount] = useState(0);

  const onGenerateReady = useCallback((fn: (() => void) | null, can: boolean, count: number, isGenerating: boolean) => {
    setGenerateFn(() => fn);
    setCanGenerate(can);
    setBdcCount(count);
    setGenerating(isGenerating);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      {/* Action button */}
      {canGenerate && (
        <div className="flex items-center justify-end">
          <Button
            disabled={generating}
            onClick={() => generateFn?.()}
          >
            {generating
              ? "Génération..."
              : `Générer ${bdcCount} bon${bdcCount > 1 ? "s" : ""} de commande`}
          </Button>
        </div>
      )}

      {/* Table of pending references */}
      <CommandeRefTable
        data={lignes}
        fonderies={fonderies}
        onGenerateReady={onGenerateReady}
      />

      {/* Generated bons de commande */}
      {(bonsCommande.length > 0 || ungroupedByFonderie.length > 0) && (
        <BonsCommandeList
          bonsCommande={bonsCommande}
          reglements={reglements}
          ungroupedByFonderie={ungroupedByFonderie}
        />
      )}
    </div>
  );
}
