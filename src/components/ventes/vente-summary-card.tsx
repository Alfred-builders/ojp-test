"use client";

import {
  Storefront,
  Receipt,
  ShoppingCart,
} from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface VenteSummaryCardProps {
  totalPrixVente: number;
  montantTaxe: number;
  nbArticles: number;
}

export function VenteSummaryCard({
  totalPrixVente,
  montantTaxe,
  nbArticles,
}: VenteSummaryCardProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card className="bg-secondary text-secondary-foreground">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-secondary-foreground/70">
            <Storefront size={16} weight="duotone" />
            Total vente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(totalPrixVente)}</p>
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
            <ShoppingCart size={16} weight="duotone" />
            Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{nbArticles}</p>
        </CardContent>
      </Card>
    </div>
  );
}
