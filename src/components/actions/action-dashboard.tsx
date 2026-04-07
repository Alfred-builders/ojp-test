"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lightning,
  CheckCircle,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSettingClient } from "@/lib/settings-client";
import { getAvailableActions, getActionSummary } from "@/lib/actions/action-registry";
import { ActionButton } from "./action-button";
import { RetractationTimer } from "./retractation-timer";
import type { ActionContext, LotAction } from "@/lib/actions/action-types";
import type { LotWithReferences, Lot } from "@/types/lot";
import type { DossierWithClient } from "@/types/dossier";

const TYPE_LABELS: Record<string, string> = {
  rachat: "Rachat",
  vente: "Vente",
  depot_vente: "Depot-vente",
};

function getLotUrl(lot: { id: string; type: string }): string {
  if (lot.type === "vente") return `/ventes/${lot.id}`;
  if (lot.type === "depot_vente") return `/depot-vente/${lot.id}`;
  return `/lots/${lot.id}`;
}

interface ActionDashboardProps {
  dossier: DossierWithClient;
  lots: LotWithReferences[];
}

export function ActionDashboard({ dossier, lots }: ActionDashboardProps) {
  const router = useRouter();
  const [retractationMs, setRetractationMs] = useState(48 * 3600_000);

  useEffect(() => {
    getSettingClient("business_rules").then((rules) => {
      if (rules) setRetractationMs(rules.retractation_heures * 3600_000);
    });
  }, []);

  const now = new Date();

  // Compute actions for each lot
  const lotActionsMap: { lot: LotWithReferences; actions: LotAction[]; ctx: ActionContext }[] = [];

  for (const lot of lots) {
    // Skip terminal lots
    if (lot.status === "finalise" || lot.status === "termine" || lot.status === "refuse" || lot.status === "retracte") continue;
    // Skip brouillon lots (they need to be finalized from the dossier button)
    if (lot.status === "brouillon") continue;

    const actions = getAvailableActions(lot, now);
    if (actions.length === 0) continue;

    const ctx: ActionContext = {
      lot,
      dossier: {
        id: dossier.id,
        numero: dossier.numero,
        client: dossier.client,
      },
      retractationMs,
    };

    lotActionsMap.push({ lot, actions, ctx });
  }

  // Count terminal lots
  const terminalLots = lots.filter(
    (l) => l.status === "finalise" || l.status === "termine" || l.status === "refuse" || l.status === "retracte"
  );

  // Nothing to show if no active lots with actions
  if (lotActionsMap.length === 0 && terminalLots.length === 0) return null;

  const totalActions = lotActionsMap.reduce((sum, { actions }) => {
    const summary = getActionSummary(actions);
    return sum + summary.total;
  }, 0);

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightning size={20} weight="duotone" />
          Actions en attente
          {totalActions > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {totalActions}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lotActionsMap.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune action en attente.
          </p>
        ) : (
          lotActionsMap.map(({ lot, actions, ctx }) => {
            const summary = getActionSummary(actions);
            const lotActions = actions.filter((a) => a.scope === "lot");

            return (
              <div
                key={lot.id}
                className="rounded-lg border p-3 space-y-3"
              >
                {/* Lot header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      href={getLotUrl(lot)}
                      className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                    >
                      {lot.numero}
                      <ArrowSquareOut size={12} weight="regular" className="text-muted-foreground" />
                    </Link>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {TYPE_LABELS[lot.type] ?? lot.type}
                    </Badge>
                    {summary.urgent.length > 0 && (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5 py-0">
                        {summary.urgent.length} urgent
                      </Badge>
                    )}
                  </div>

                  {/* Retractation timer (compact) */}
                  {lot.status === "en_retractation" && (
                    <RetractationTimer
                      startDate={lot.date_acceptation}
                      endDate={lot.date_fin_retractation}
                      compact
                    />
                  )}
                </div>

                {/* Lot-level actions */}
                {lotActions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {lotActions.map((action) => (
                      <ActionButton
                        key={action.id}
                        action={action}
                        ctx={ctx}
                      />
                    ))}
                  </div>
                )}

                {/* Reference-level actions grouped by reference */}
                {summary.urgent.filter((a) => a.scope === "reference").length > 0 && (
                  <div className="space-y-2 pl-3 border-l-2 border-muted">
                    {groupRefActions(actions.filter((a) => a.scope === "reference")).map(({ refId, designation, refActions }) => (
                      <div key={refId} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {designation}
                        </span>
                        <div className="flex items-center gap-1">
                          {refActions.map((action) => (
                            <ActionButton
                              key={`${action.id}-${action.referenceId}`}
                              action={action}
                              ctx={ctx}
                              size="sm"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Terminal lots summary */}
        {terminalLots.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <CheckCircle size={14} weight="duotone" className="text-emerald-500" />
            {terminalLots.length} lot{terminalLots.length > 1 ? "s" : ""} finalise{terminalLots.length > 1 ? "s" : ""}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function groupRefActions(actions: LotAction[]): { refId: string; designation: string; refActions: LotAction[] }[] {
  const map = new Map<string, { designation: string; refActions: LotAction[] }>();
  for (const action of actions) {
    if (!action.referenceId) continue;
    const existing = map.get(action.referenceId);
    if (existing) {
      existing.refActions.push(action);
    } else {
      map.set(action.referenceId, {
        designation: action.referenceDesignation ?? "Reference",
        refActions: [action],
      });
    }
  }
  return Array.from(map.entries()).map(([refId, data]) => ({ refId, ...data }));
}
