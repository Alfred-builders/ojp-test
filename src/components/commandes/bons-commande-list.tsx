"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Storefront, ArrowRight } from "@phosphor-icons/react";
import { createSimpleBDC } from "@/lib/fonderie/create-bon-commande";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BonCommande } from "@/types/bon-commande";
import { formatCurrency, formatDate } from "@/lib/format";
import { BDC_STATUS_CONFIG } from "@/lib/fonderie/status-config";
import type { Reglement } from "@/types/reglement";

interface FonderieGroup {
  fonderie_id: string;
  fonderie_nom: string;
  ligne_ids: string[];
  total: number;
  count: number;
}

interface BonsCommandeListProps {
  bonsCommande: BonCommande[];
  reglements: Reglement[];
  ungroupedByFonderie: FonderieGroup[];
}

const MAX_VISIBLE = 5;

export function BonsCommandeList({ bonsCommande, ungroupedByFonderie }: BonsCommandeListProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function handleGenerateBDC(group: FonderieGroup) {
    setGenerating(true);
    await createSimpleBDC({ fonderie_id: group.fonderie_id, ligne_ids: group.ligne_ids });
    setGenerating(false);
    router.refresh();
  }

  async function handleGenerateAll() {
    setGenerating(true);
    for (const group of ungroupedByFonderie) {
      const result = await createSimpleBDC({ fonderie_id: group.fonderie_id, ligne_ids: group.ligne_ids });
      if (!result.success) break;
    }
    setGenerating(false);
    router.refresh();
  }

  const visibleBons = showAll ? bonsCommande : bonsCommande.slice(0, MAX_VISIBLE);
  const hasMore = bonsCommande.length > MAX_VISIBLE;

  if (bonsCommande.length === 0 && ungroupedByFonderie.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText size={32} weight="duotone" className="mb-2 opacity-50" />
          <p className="text-sm">Aucun bon de commande.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Ungrouped lines alert */}
      {ungroupedByFonderie.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Storefront size={16} weight="duotone" />
              Lignes en attente de bon de commande
              {ungroupedByFonderie.length > 1 && (
                <Button size="sm" className="ml-auto" disabled={generating} onClick={handleGenerateAll}>
                  <Plus size={14} weight="bold" />
                  {generating ? "Génération..." : "Générer tous les BDC"}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ungroupedByFonderie.map((group) => (
              <div key={group.fonderie_id} className="flex items-center justify-between rounded-lg border bg-white dark:bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{group.fonderie_nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.count} ligne{group.count > 1 ? "s" : ""} · {formatCurrency(group.total)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" disabled={generating} onClick={() => handleGenerateBDC(group)}>
                  <FileText size={14} weight="duotone" />
                  {generating ? "..." : "Générer BDC"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Compact list of bons de commande */}
      {bonsCommande.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText size={16} weight="duotone" />
              Bons de commande ({bonsCommande.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {visibleBons.map((bdc) => {
                const badge = BDC_STATUS_CONFIG[bdc.statut] ?? BDC_STATUS_CONFIG.brouillon;
                const fonderie = bdc.fonderie?.nom ?? "Fonderie";
                const nbLignes = bdc.lignes?.length ?? 0;

                return (
                  <Link
                    key={bdc.id}
                    href={`/fonderie/suivi/bdc/${bdc.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{bdc.numero}</span>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fonderie} · {nbLignes} ligne{nbLignes > 1 ? "s" : ""}
                        {bdc.date_envoi ? ` · ${formatDate(bdc.date_envoi)}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-bold shrink-0">{formatCurrency(bdc.montant_total)}</span>
                    <ArrowRight size={14} weight="regular" className="text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
            {hasMore && !showAll && (
              <div className="px-4 py-2 border-t">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(true)}>
                  Voir les {bonsCommande.length - MAX_VISIBLE} autres
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
