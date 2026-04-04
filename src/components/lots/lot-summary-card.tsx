"use client";

import {
  CurrencyEur,
  TrendUp,
  Receipt,
  Wallet,
  Percent,
  Tag,
} from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

interface LotSummaryCardProps {
  totalPrixAchat: number;
  totalPrixRevente: number;
  margeBrute: number;
  montantTaxe: number;
  montantNet: number;
  lotType?: "rachat" | "depot_vente";
}

export function LotSummaryCard({
  totalPrixAchat,
  totalPrixRevente,
  margeBrute,
  montantTaxe,
  montantNet,
  lotType = "rachat",
}: LotSummaryCardProps) {
  if (lotType === "depot_vente") {
    const commission = totalPrixRevente - totalPrixAchat;
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="bg-secondary text-secondary-foreground">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-secondary-foreground/70">
              <CurrencyEur size={16} weight="duotone" />
              Prix estimé (rachat)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPrixAchat)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag size={16} weight="duotone" />
              Prix de revente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPrixRevente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Percent size={16} weight="duotone" />
              Commission (40%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(commission)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Card className="bg-secondary text-secondary-foreground">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-secondary-foreground/70">
            <CurrencyEur size={16} weight="duotone" />
            Prix de rachat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(totalPrixAchat)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Receipt size={16} weight="duotone" />
            Taxes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(montantTaxe)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet size={16} weight="duotone" />
            Montant net
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(montantNet)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendUp size={16} weight="duotone" />
            Marge brute
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(margeBrute)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
