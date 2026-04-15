"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommandeRefTable } from "@/components/commandes/commande-ref-table";
import { BonsLivraisonList } from "@/components/livraisons/bons-livraison-list";
import { Button } from "@/components/ui/button";
import { Coins, Diamond, Check, ArrowRight } from "@phosphor-icons/react";
import type { CommandeLigneFlat } from "@/types/commande";
import type { Fonderie } from "@/types/fonderie";

interface RoutagePageClientProps {
  lignes: CommandeLigneFlat[];
  fonderies: Fonderie[];
}

export function RoutagePageClient({
  lignes,
  fonderies,
}: RoutagePageClientProps) {
  const [activeTab, setActiveTab] = useState("commandes");
  const [generateFn, setGenerateFn] = useState<(() => void) | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bdcCount, setBdcCount] = useState(0);

  const onGenerateReady = useCallback(
    (fn: (() => void) | null, can: boolean, count: number, isGenerating: boolean) => {
      setGenerateFn(() => fn);
      setCanGenerate(can);
      setBdcCount(count);
      setGenerating(isGenerating);
    },
    [],
  );

  const pendingCommandeCount = lignes.filter(
    (l) => l.fulfillment === "pending" || l.fulfillment === "a_commander",
  ).length;

  return (
    <Tabs defaultValue="commandes" value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 min-w-0">
      <div className="flex items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="commandes" className="gap-1.5">
            <Coins size={14} weight="duotone" />
            Commandes
            {pendingCommandeCount > 0 && (
              <span className="ml-1 text-[10px] font-semibold bg-foreground/10 text-foreground rounded-full px-1.5 py-0.5">
                {pendingCommandeCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="envois" className="gap-1.5">
            <Diamond size={14} weight="duotone" />
            Fonte
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          {activeTab === "commandes" && canGenerate && (
            <Button disabled={generating} onClick={() => generateFn?.()}>
              <Check size={14} weight="bold" />
              {generating ? "Validation..." : "Valider le dispatch"}
            </Button>
          )}
          <Link href="/fonderie/suivi">
            <Button variant="outline" size="sm">
              Voir le suivi
              <ArrowRight size={14} weight="regular" />
            </Button>
          </Link>
        </div>
      </div>

      <TabsContent value="commandes" className="flex flex-col flex-1 min-h-0 mt-4">
        <CommandeRefTable
          data={lignes}
          fonderies={fonderies}
          onGenerateReady={onGenerateReady}
        />
      </TabsContent>

      <TabsContent value="envois" className="flex flex-col flex-1 min-h-0 mt-4">
        <BonsLivraisonList
          fonderies={fonderies}
        />
      </TabsContent>
    </Tabs>
  );
}
