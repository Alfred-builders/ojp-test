"use client";

import { useState, useCallback } from "react";
import { ShoppingCart, Factory } from "@phosphor-icons/react";
import { CommandeRefTable } from "@/components/commandes/commande-ref-table";
import { BonsCommandeList } from "@/components/commandes/bons-commande-list";
import { BonsLivraisonList } from "@/components/livraisons/bons-livraison-list";
import { Button } from "@/components/ui/button";
import type { LotWithDossier } from "@/types/lot";
import type { CommandeLigneFlat } from "@/types/commande";
import type { BonCommande } from "@/types/bon-commande";
import type { BonLivraison } from "@/types/bon-livraison";
import type { Reglement } from "@/types/reglement";
import type { Fonderie } from "@/types/fonderie";

interface CommandePageClientProps {
  lots: LotWithDossier[];
  lignes: CommandeLigneFlat[];
  bonsCommande?: BonCommande[];
  bonsLivraison?: BonLivraison[];
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

const TAB_ACTIVE = "bg-background text-foreground shadow-sm";
const TAB_INACTIVE = "text-muted-foreground hover:text-foreground";

export function CommandePageClient({
  lignes,
  bonsCommande = [],
  bonsLivraison = [],
  reglements = [],
  ungroupedByFonderie = [],
  fonderies = [],
}: CommandePageClientProps) {
  const [section, setSection] = useState<"achats" | "envois">("achats");
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

  // Count pending items for badge
  const pendingAchats = lignes.filter((l) => l.fulfillment === "pending" || l.fulfillment === "a_commander").length;
  const pendingEnvois = bonsLivraison.filter((b) => b.statut === "recu").length;

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      {/* Top bar: section tabs + action button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => setSection("achats")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              section === "achats" ? TAB_ACTIVE : TAB_INACTIVE
            }`}
          >
            <ShoppingCart size={14} weight="duotone" />
            Achats fonderie
            {pendingAchats > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {pendingAchats}
              </span>
            )}
          </button>
          <button
            onClick={() => setSection("envois")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              section === "envois" ? TAB_ACTIVE : TAB_INACTIVE
            }`}
          >
            <Factory size={14} weight="duotone" />
            Envois fonderie
            {pendingEnvois > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {pendingEnvois}
              </span>
            )}
          </button>
        </div>

        {/* Generate BDC button (achats only) */}
        {section === "achats" && canGenerate && (
          <Button
            disabled={generating}
            onClick={() => generateFn?.()}
          >
            {generating
              ? "Génération..."
              : `Générer ${bdcCount} bon${bdcCount > 1 ? "s" : ""} de commande`}
          </Button>
        )}
      </div>

      {/* Content */}
      {section === "achats" && (
        <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-6">
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
      )}

      {section === "envois" && (
        <BonsLivraisonList
          bonsLivraison={bonsLivraison}
          fonderies={fonderies}
        />
      )}
    </div>
  );
}
