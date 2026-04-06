"use client";

import Link from "next/link";
import { ClipboardText, ArrowRight } from "@phosphor-icons/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface CommandeRow {
  id: string;
  lotId: string;
  lotNumero: string;
  designation: string;
  clientName: string;
  fulfillment: string;
}

const FULFILLMENT_CONFIG: Record<string, { label: string; className: string }> =
  {
    pending: {
      label: "En attente",
      className:
        "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800",
    },
    a_commander: {
      label: "À commander",
      className:
        "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/30",
    },
    commande: {
      label: "Commandé",
      className:
        "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30",
    },
  };

function CommandeRowItem({ c }: { c: CommandeRow }) {
  const config = FULFILLMENT_CONFIG[c.fulfillment];
  return (
    <Link
      href={`/ventes/${c.lotId}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{c.designation}</p>
        <p className="truncate text-xs text-muted-foreground">{c.clientName}</p>
      </div>
      {config && (
        <Badge variant="secondary" className={config.className}>
          {config.label}
        </Badge>
      )}
    </Link>
  );
}

const MAX_VISIBLE = 3;

export function DashboardCommandes({
  commandes,
}: {
  commandes: CommandeRow[];
}) {
  const hasMore = commandes.length > MAX_VISIBLE;

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardText size={18} weight="duotone" />
          Commandes à suivre
        </CardTitle>
        {hasMore && (
          <CardAction>
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" />
                }
              >
                Voir tout ({commandes.length})
                <ArrowRight size={14} weight="bold" />
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>Commandes à suivre</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <div className="space-y-1">
                    {commandes.map((c) => (
                      <CommandeRowItem key={c.id} c={c} />
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        {commandes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune commande en attente.
          </p>
        ) : (
          <div className="space-y-1">
            {commandes.slice(0, MAX_VISIBLE).map((c) => (
              <CommandeRowItem key={c.id} c={c} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
