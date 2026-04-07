"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Lightning,
  Money,
  FileText,
  ShieldCheck,
  HandCoins,
  Package,
  Storefront,
  CheckCircle,
  XCircle,
  ArrowCounterClockwise,
  ArrowUUpLeft,
  ShoppingCart,
} from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSettingClient } from "@/lib/settings-client";
import { getAvailableActions, getActionSummary } from "@/lib/actions/action-registry";
import { detectPaymentsDue } from "@/lib/reglements/detect-payments-due";
import { ActionButton } from "./action-button";
import { RestitutionDialog } from "./restitution-dialog";
import { CommandeDialog } from "./commande-dialog";
import { ReglementDialog } from "@/components/reglements/reglement-dialog";
import { formatCurrency } from "@/lib/format";
import type { ActionContext, LotAction } from "@/lib/actions/action-types";
import type { PaymentDue } from "@/lib/reglements/detect-payments-due";
import type { LotWithReferences } from "@/types/lot";
import type { DossierWithClient } from "@/types/dossier";
import type { DocumentRecord } from "@/types/document";
import type { Reglement } from "@/types/reglement";
import type { VenteLigne } from "@/types/vente";
import type { BonCommande } from "@/types/bon-commande";

function getLotUrl(lot: { id: string; type: string }): string {
  if (lot.type === "vente") return `/ventes/${lot.id}`;
  if (lot.type === "depot_vente") return `/depot-vente/${lot.id}`;
  return `/lots/${lot.id}`;
}

interface ActionDashboardProps {
  dossier: DossierWithClient;
  lots: LotWithReferences[];
  documents?: DocumentRecord[];
  reglements?: Reglement[];
  venteLignes?: VenteLigne[];
  bonsCommande?: BonCommande[];
}

interface FlatAction {
  action: LotAction;
  ctx: ActionContext;
  lot: LotWithReferences;
}

export function ActionDashboard({
  dossier,
  lots,
  documents = [],
  reglements = [],
  venteLignes = [],
  bonsCommande = [],
}: ActionDashboardProps) {
  const [retractationMs, setRetractationMs] = useState(48 * 3600_000);
  const [acomptePct, setAcomptePct] = useState(10);
  const [restitutionLot, setRestitutionLot] = useState<LotWithReferences | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<{ payment: PaymentDue; lotId: string } | null>(null);
  const [commandeLotId, setCommandeLotId] = useState<string | null>(null);

  useEffect(() => {
    getSettingClient("business_rules").then((rules) => {
      if (rules) {
        setRetractationMs(rules.retractation_heures * 3600_000);
        setAcomptePct(rules.acompte_pct);
      }
    });
  }, []);

  const now = new Date();

  // Build flat list of all actions across all lots
  const allActions = useMemo(() => {
    const result: FlatAction[] = [];

    for (const lot of lots) {
      if (lot.status === "brouillon") continue;

      const lotReglements = reglements.filter((r) => r.lot_id === lot.id);
      const lotLignes = venteLignes.filter((l) => l.lot_id === lot.id);
      const lotBdcIds = new Set(lotLignes.filter((l) => l.bon_commande_id).map((l) => l.bon_commande_id!));
      const lotBdcs = bonsCommande.filter((b) => lotBdcIds.has(b.id));

      const lotDocuments = (documents ?? []).filter((d) => d.lot_id === lot.id);
      const paymentsDue = detectPaymentsDue({
        lot,
        lignes: lotLignes,
        lotReferences: lot.references,
        reglements: lotReglements,
        bonsCommande: lotBdcs,
        documents: lotDocuments,
        clientId: dossier.client.id,
        acompte_pct: acomptePct,
      });

      const actions = getAvailableActions({
        lot,
        now,
        documents,
        paymentsDue,
        venteLignes,
        bonsCommande,
      });

      const ctx: ActionContext = {
        lot,
        dossier: { id: dossier.id, numero: dossier.numero, client: dossier.client },
        retractationMs,
      };

      for (const action of actions) {
        result.push({ action, ctx, lot });
      }
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, documents, reglements, venteLignes, bonsCommande, dossier, retractationMs, acomptePct]);

  const totalLots = lots.length;
  const terminalLots = lots.filter(
    (l) => l.status === "finalise" || l.status === "termine" || l.status === "refuse" || l.status === "retracte"
  );

  if (totalLots === 0) return null;

  // Merge accepter + refuser devis into a single row
  const rows = buildRows(allActions);

  return (
    <>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightning size={20} weight="duotone" />
            Actions en attente
            {rows.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {rows.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune action en attente.
            </p>
          ) : (
            rows.map((row, i) => (
              <ActionRow
                key={i}
                row={row}
                onRestituer={(lot) => setRestitutionLot(lot)}
                onPayment={(payment, lotId) => setSelectedPayment({ payment, lotId })}
                onCommande={(lotId) => setCommandeLotId(lotId)}
              />
            ))
          )}
        </CardContent>
        <CardFooter className="justify-end pt-2">
          <span className="text-xs text-muted-foreground">
            {terminalLots.length}/{totalLots} lot{totalLots > 1 ? "s" : ""} terminé{terminalLots.length > 1 ? "s" : ""}
          </span>
        </CardFooter>
      </Card>

      {restitutionLot && (
        <RestitutionDialog
          open={!!restitutionLot}
          onOpenChange={(open) => { if (!open) setRestitutionLot(null); }}
          lot={restitutionLot}
          dossierClient={dossier.client}
        />
      )}

      {selectedPayment && (
        <ReglementDialog
          open={!!selectedPayment}
          onOpenChange={(open) => { if (!open) setSelectedPayment(null); }}
          paymentDue={selectedPayment.payment}
          lotId={selectedPayment.lotId}
        />
      )}

      {commandeLotId && (
        <CommandeDialog
          open={!!commandeLotId}
          onOpenChange={(open) => { if (!open) setCommandeLotId(null); }}
          lotId={commandeLotId}
        />
      )}
    </>
  );
}

// ── Row types ───────────────────────────────────────────────

type ActionRowData =
  | { type: "devis"; label: string; lotHref?: string; primary: FlatAction; secondary: FlatAction }
  | { type: "retracter"; label: string; lotHref?: string; flat: FlatAction }
  | { type: "restituer"; label: string; lot: LotWithReferences }
  | { type: "payment"; label: string; amount: number; lotHref?: string; flat: FlatAction }
  | { type: "generic"; label: string; lotHref?: string; flat: FlatAction };

function buildRows(allActions: FlatAction[]): ActionRowData[] {
  const rows: ActionRowData[] = [];
  const skip = new Set<number>();

  for (let i = 0; i < allActions.length; i++) {
    if (skip.has(i)) continue;
    const { action, lot } = allActions[i];

    // Pair accepter + refuser devis
    if (action.id === "lot.accepter_devis") {
      const refuserIdx = allActions.findIndex(
        (a, j) => j > i && !skip.has(j) && a.action.id === "lot.refuser_devis" && a.lot.id === lot.id
      );
      if (refuserIdx !== -1) {
        skip.add(refuserIdx);
        rows.push({
          type: "devis",
          label: action.label,
          lotHref: action.lotHref,
          primary: allActions[i],
          secondary: allActions[refuserIdx],
        });
        continue;
      }
    }

    // Skip standalone refuser (already paired above)
    if (action.id === "lot.refuser_devis") continue;

    // Retractation
    if (action.id === "lot.retracter") {
      rows.push({ type: "retracter", label: action.label, lotHref: action.lotHref, flat: allActions[i] });
      continue;
    }

    // Restitution
    if (action.id === "ref.restituer") {
      rows.push({ type: "restituer", label: action.label, lot });
      continue;
    }

    // Payment
    if (action.scope === "payment" && action.paymentDue) {
      rows.push({
        type: "payment",
        label: action.label,
        amount: action.paymentDue.montant_restant,
        lotHref: action.lotHref,
        flat: allActions[i],
      });
      continue;
    }

    // Generic
    rows.push({ type: "generic", label: action.label, lotHref: action.lotHref, flat: allActions[i] });
  }

  return rows;
}

// ── Action Row ──────────────────────────────────────────────

function ActionIcon({ type }: { type: "devis" | "contrat" | "depot_vente" | "payment" | "vente" | "generic" }) {
  const iconClass = "text-muted-foreground";
  const wrapClass = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted";

  switch (type) {
    case "devis":
      return <div className={wrapClass}><FileText size={16} weight="duotone" className={iconClass} /></div>;
    case "contrat":
      return <div className={wrapClass}><ShieldCheck size={16} weight="duotone" className={iconClass} /></div>;
    case "depot_vente":
      return <div className={wrapClass}><HandCoins size={16} weight="duotone" className={iconClass} /></div>;
    case "payment":
      return <div className={wrapClass}><Money size={16} weight="duotone" className={iconClass} /></div>;
    case "vente":
      return <div className={wrapClass}><Storefront size={16} weight="duotone" className={iconClass} /></div>;
    default:
      return <div className={wrapClass}><Package size={16} weight="duotone" className={iconClass} /></div>;
  }
}

function ActionRow({ row, onRestituer, onPayment, onCommande }: {
  row: ActionRowData;
  onRestituer: (lot: LotWithReferences) => void;
  onPayment: (payment: PaymentDue, lotId: string) => void;
  onCommande: (lotId: string) => void;
}) {
  const router = useRouter();
  switch (row.type) {
    case "devis":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="devis" />
            <span className="text-sm truncate">{row.label}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {row.lotHref ? (
              <>
                <Button size="sm" variant="outline" onClick={() => router.push(row.lotHref!)}><CheckCircle size={14} weight="duotone" />Accepter</Button>
                <Button size="sm" variant="outline" onClick={() => router.push(row.lotHref!)}><XCircle size={14} weight="duotone" />Refuser</Button>
              </>
            ) : (
              <>
                <ActionButton action={{ ...row.primary.action, label: "Accepter", variant: "outline" }} ctx={row.primary.ctx} />
                <ActionButton action={{ ...row.secondary.action, label: "Refuser", variant: "outline" }} ctx={row.secondary.ctx} />
              </>
            )}
          </div>
        </div>
      );

    case "retracter":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="contrat" />
            <span className="text-sm truncate">{row.label}</span>
          </div>
          {row.lotHref ? (
            <Button size="sm" variant="outline" onClick={() => router.push(row.lotHref!)}><ArrowCounterClockwise size={14} weight="duotone" />Se rétracte</Button>
          ) : (
            <ActionButton action={{ ...row.flat.action, variant: "outline" }} ctx={row.flat.ctx} />
          )}
        </div>
      );

    case "restituer":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="depot_vente" />
            <span className="text-sm truncate">{row.label}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => onRestituer(row.lot)}>Restituer un article</Button>
        </div>
      );

    case "payment":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="payment" />
            <span className="text-sm truncate">{row.label}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              {formatCurrency(row.amount)}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (row.flat.action.paymentDue) {
                onPayment(row.flat.action.paymentDue, row.flat.lot.id);
              }
            }}
          >
            Enregistrer
          </Button>
        </div>
      );

    case "generic": {
      const isCommander = row.flat.action.id === "vente.livrer";
      const btnLabel = isCommander ? "Commander les références" : "Voir";
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type={isCommander ? "vente" : "generic"} />
            <span className="text-sm truncate">{row.label}</span>
          </div>
          {isCommander ? (
            <Button size="sm" variant="outline" onClick={() => onCommande(row.flat.lot.id)}>Commander</Button>
          ) : row.lotHref ? (
            <Button size="sm" variant="outline" onClick={() => router.push(row.lotHref!)}>Voir</Button>
          ) : (
            <ActionButton action={{ ...row.flat.action, label: btnLabel, variant: "outline" }} ctx={row.flat.ctx} />
          )}
        </div>
      );
    }
  }
}
