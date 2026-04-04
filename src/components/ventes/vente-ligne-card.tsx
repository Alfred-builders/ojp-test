"use client";

import { useState } from "react";
import { Diamond, Coins, DotsThree, PencilSimple, Trash, WarningCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { VenteLigne } from "@/types/vente";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

interface VenteLigneCardProps {
  ligne: VenteLigne;
  onEdit?: (ligne: VenteLigne) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

const FULFILLMENT_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300" },
  servi_stock: { label: "Servi stock", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
  a_commander: { label: "À commander", className: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" },
  commande: { label: "Commandé", className: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "Reçu", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

export function VenteLigneCard({ ligne, onEdit, onDelete, canEdit }: VenteLigneCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isOrInvest = !!ligne.or_investissement_id;
  const fulfillment = ligne.fulfillment && isOrInvest ? FULFILLMENT_CONFIG[ligne.fulfillment] : null;

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-white dark:bg-card px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {isOrInvest ? (
          <Coins size={18} weight="duotone" className="text-muted-foreground" />
        ) : (
          <Diamond size={18} weight="duotone" className="text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm truncate">{ligne.designation}</span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {ligne.metal && <span>{ligne.metal}</span>}
          {ligne.qualite && <span>· {ligne.qualite}</span>}
          {ligne.poids && <span>· {ligne.poids}g</span>}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-lg font-bold">{formatCurrency(ligne.prix_total)}</p>
      </div>

      {fulfillment && (
        <Badge variant="secondary" className={fulfillment.className}>
          {fulfillment.label}
        </Badge>
      )}

      {canEdit && (onEdit || onDelete) && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" />}
            >
              <DotsThree size={16} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(ligne)}>
                  <PencilSimple size={14} weight="duotone" />
                  Modifier
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  {onEdit && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Trash size={14} weight="duotone" />
                    Retirer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <WarningCircle size={20} weight="duotone" className="text-destructive" />
                  Retirer l&apos;article
                </DialogTitle>
                <DialogDescription>
                  Retirer &quot;{ligne.designation}&quot; de la vente ? Le bijou sera remis en stock.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete?.(ligne.id);
                    setConfirmOpen(false);
                  }}
                >
                  <Trash size={14} weight="duotone" />
                  Retirer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
