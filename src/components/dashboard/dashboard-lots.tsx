"use client";

import Link from "next/link";
import { Package, ArrowRight } from "@phosphor-icons/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface LotRow {
  id: string;
  numero: string;
  type: string;
  status: string;
  clientName: string;
  createdAt: string;
  allLivre?: boolean;
  /** Action description computed from lot state */
  action?: string;
}

const TYPE_LABELS: Record<string, string> = {
  rachat: "Rachat",
  vente: "Vente",
  depot_vente: "Dépôt-vente",
};

function lotHref(lot: LotRow) {
  if (lot.type === "vente") return `/ventes/${lot.id}`;
  if (lot.type === "depot_vente") return `/depot-vente/${lot.id}`;
  return `/lots/${lot.id}`;
}

function LotRowItem({ lot }: { lot: LotRow }) {
  return (
    <Link
      href={lotHref(lot)}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {lot.action ?? TYPE_LABELS[lot.type] ?? lot.type}
        </p>
        <p className="text-xs text-muted-foreground">
          {lot.numero} · {lot.clientName}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {TYPE_LABELS[lot.type] ?? lot.type}
      </span>
    </Link>
  );
}

const MAX_VISIBLE = 3;

export function DashboardLots({ lots }: { lots: LotRow[] }) {
  const hasMore = lots.length > MAX_VISIBLE;

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package size={18} weight="duotone" />
          Lots à traiter
        </CardTitle>
        {hasMore && (
          <CardAction>
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" />
                }
              >
                Voir tout ({lots.length})
                <ArrowRight size={14} weight="bold" />
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>Lots à traiter</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <div className="space-y-2">
                    {lots.map((lot) => (
                      <LotRowItem key={lot.id} lot={lot} />
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        {lots.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun lot en cours.
          </p>
        ) : (
          <div className="space-y-2">
            {lots.slice(0, MAX_VISIBLE).map((lot) => (
              <LotRowItem key={lot.id} lot={lot} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
