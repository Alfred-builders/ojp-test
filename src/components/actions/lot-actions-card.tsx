"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lightning,
  Money,
  FileText,
  ShieldCheck,
  HandCoins,
  PenNib,
} from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionButton } from "./action-button";
import { RestitutionDialog } from "./restitution-dialog";
import type { DossierClient } from "@/types/dossier";
import { ReglementDialog } from "@/components/reglements/reglement-dialog";
import { formatCurrency } from "@/lib/format";
import type { ActionContext, LotAction } from "@/lib/actions/action-types";
import type { PaymentDue } from "@/lib/reglements/detect-payments-due";
import type { LotWithReferences } from "@/types/lot";
interface LotActionsCardProps {
  actions: LotAction[];
  ctx: ActionContext;
  lot: LotWithReferences;
  dossierClient: {
    id: string;
    civility: string;
    first_name: string;
    last_name: string;
    city?: string | null;
    is_valid?: boolean;
    address?: string | null;
    postal_code?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  lotId: string;
}

export function LotActionsCard({ actions, ctx, lot, dossierClient, lotId }: LotActionsCardProps) {
  const router = useRouter();
  const [restitutionLot, setRestitutionLot] = useState<LotWithReferences | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDue | null>(null);

  const activeActions = actions.filter((a) => !a.disabled);
  if (activeActions.length === 0) return null;

  // Build rows: pair accepter+refuser devis
  const rows: RowData[] = [];
  const skip = new Set<number>();

  for (let i = 0; i < activeActions.length; i++) {
    if (skip.has(i)) continue;
    const action = activeActions[i];

    if (action.id === "lot.accepter_devis") {
      const refuserIdx = activeActions.findIndex((a, j) => j > i && !skip.has(j) && a.id === "lot.refuser_devis");
      if (refuserIdx !== -1) {
        skip.add(refuserIdx);
        rows.push({ type: "devis", label: action.label, primary: action, secondary: activeActions[refuserIdx] });
        continue;
      }
    }
    if (action.id === "lot.refuser_devis") continue;

    if (action.id === "lot.retracter") {
      rows.push({ type: "retracter", label: action.label, action });
      continue;
    }

    if (action.id === "ref.restituer") {
      rows.push({ type: "restituer", label: action.label });
      continue;
    }

    if (action.id === "doc.signer_contrat_dpv") {
      rows.push({ type: "signer_contrat", label: action.label, action });
      continue;
    }

    if (action.scope === "payment" && action.paymentDue) {
      rows.push({ type: "payment", label: action.label, amount: action.paymentDue.montant_restant, payment: action.paymentDue });
      continue;
    }

    rows.push({ type: "generic", label: action.label, action });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightning size={20} weight="duotone" />
            Actions en attente
            <Badge variant="secondary">
              {rows.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((row, i) => (
            <ActionRow
              key={i}
              row={row}
              ctx={ctx}
              onRestituer={() => setRestitutionLot(lot)}
              onPayment={(p) => setSelectedPayment(p)}
            />
          ))}
        </CardContent>
      </Card>

      {restitutionLot && (
        <RestitutionDialog
          open={!!restitutionLot}
          onOpenChange={(open) => { if (!open) setRestitutionLot(null); }}
          lot={restitutionLot}
          dossierClient={dossierClient as DossierClient}
        />
      )}

      {selectedPayment && (
        <ReglementDialog
          open={!!selectedPayment}
          onOpenChange={(open) => { if (!open) setSelectedPayment(null); }}
          paymentDue={selectedPayment}
          lotId={lotId}
        />
      )}
    </>
  );
}

// ── Types ──

type RowData =
  | { type: "devis"; label: string; primary: LotAction; secondary: LotAction }
  | { type: "retracter"; label: string; action: LotAction }
  | { type: "restituer"; label: string }
  | { type: "signer_contrat"; label: string; action: LotAction }
  | { type: "payment"; label: string; amount: number; payment: PaymentDue }
  | { type: "generic"; label: string; action: LotAction };

// ── Label with bold prefix ──

function ActionLabel({ label }: { label: string }) {
  const parts = label.split(" | ");
  if (parts.length === 2) {
    return (
      <span className="text-sm truncate">
        <span className="font-semibold">{parts[0]}</span>
        <span className="text-muted-foreground mx-1.5">|</span>
        {parts[1]}
      </span>
    );
  }
  return <span className="text-sm truncate">{label}</span>;
}

// ── Icons ──

function ActionIcon({ type }: { type: string }) {
  const iconClass = "text-muted-foreground";
  const wrapClass = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted";

  switch (type) {
    case "devis":
      return <div className={wrapClass}><FileText size={16} weight="duotone" className={iconClass} /></div>;
    case "retracter":
      return <div className={wrapClass}><ShieldCheck size={16} weight="duotone" className={iconClass} /></div>;
    case "restituer":
      return <div className={wrapClass}><HandCoins size={16} weight="duotone" className={iconClass} /></div>;
    case "signer_contrat":
      return <div className={wrapClass}><PenNib size={16} weight="duotone" className={iconClass} /></div>;
    case "payment":
      return <div className={wrapClass}><Money size={16} weight="duotone" className={iconClass} /></div>;
    default:
      return <div className={wrapClass}><Lightning size={16} weight="duotone" className={iconClass} /></div>;
  }
}

// ── Row ──

function ActionRow({ row, ctx, onRestituer, onPayment }: {
  row: RowData;
  ctx: ActionContext;
  onRestituer: () => void;
  onPayment: (p: PaymentDue) => void;
}) {
  switch (row.type) {
    case "devis":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="devis" />
            <ActionLabel label={row.label} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ActionButton action={{ ...row.primary, label: "Accepter", variant: "outline" }} ctx={ctx} />
            <ActionButton action={{ ...row.secondary, label: "Refuser", variant: "outline" }} ctx={ctx} />
          </div>
        </div>
      );

    case "retracter":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="retracter" />
            <ActionLabel label={row.label} />
          </div>
          <ActionButton action={{ ...row.action, label: "Se rétracter", variant: "destructive" }} ctx={ctx} />
        </div>
      );

    case "restituer":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="restituer" />
            <ActionLabel label={row.label} />
          </div>
          <Button size="sm" variant="outline" onClick={onRestituer}><HandCoins size={14} weight="duotone" />Restituer un article</Button>
        </div>
      );

    case "signer_contrat":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="signer_contrat" />
            <ActionLabel label={row.label} />
          </div>
          <ActionButton action={{ ...row.action, label: "Marquer comme signé", variant: "outline", icon: "PenNib" }} ctx={ctx} />
        </div>
      );

    case "payment":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="payment" />
            <ActionLabel label={row.label} />
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              {formatCurrency(row.amount)}
            </Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => onPayment(row.payment)}>
            Enregistrer
          </Button>
        </div>
      );

    case "generic":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <ActionIcon type="generic" />
            <ActionLabel label={row.label} />
          </div>
          <ActionButton action={{ ...row.action, variant: "outline" }} ctx={ctx} />
        </div>
      );
  }
}
