"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ShoppingCart,
  Storefront,
  HandCoins,
  DotsThree,
  Eye,
  Trash,
  WarningCircle,
  Package,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { VenteStatusBadge } from "@/components/ventes/vente-status-badge";
import { formatDate, formatCurrency } from "@/lib/format";
import type { Lot, LotStatus } from "@/types/lot";
import type { DossierStatus } from "@/types/dossier";

interface DossierLotsSectionProps {
  lots: Lot[];
  dossierStatus: DossierStatus;
  creatingLot: boolean;
  onCreateLot: (type: "rachat" | "vente" | "depot_vente") => void;
  onDeleteLot: (lotId: string) => void;
}

export function DossierLotsSection({
  lots,
  dossierStatus,
  creatingLot,
  onCreateLot,
  onDeleteLot,
}: DossierLotsSectionProps) {
  const router = useRouter();
  const [deletingLotId, setDeletingLotId] = useState<string | null>(null);

  function getLotUrl(lot: Lot): string {
    if (lot.type === "vente") return `/ventes/${lot.id}`;
    if (lot.type === "depot_vente") return `/depot-vente/${lot.id}`;
    return `/lots/${lot.id}`;
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package size={20} weight="duotone" />
          Lots ({lots.length})
        </CardTitle>
        {dossierStatus === "brouillon" && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" variant="secondary" disabled={creatingLot}>
                  <Plus size={14} weight="bold" />
                  {creatingLot ? "Création..." : "Nouveau lot"}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onCreateLot("rachat")}>
                <ShoppingCart size={16} weight="duotone" />
                Rachat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateLot("vente")}>
                <Storefront size={16} weight="duotone" />
                Vente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateLot("depot_vente")}>
                <HandCoins size={16} weight="duotone" />
                Dépôt-vente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        {lots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucun lot pour ce dossier.
          </p>
        ) : (
          <div className="space-y-2">
            {lots.map((lot) => (
              <div
                key={lot.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => router.push(getLotUrl(lot))}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                    {lot.type === "vente" ? (
                      <Storefront size={16} weight="duotone" className="text-muted-foreground" />
                    ) : lot.type === "depot_vente" ? (
                      <HandCoins size={16} weight="duotone" className="text-muted-foreground" />
                    ) : (
                      <ShoppingCart size={16} weight="duotone" className="text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{lot.numero}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {lot.type === "vente" ? "Vente" : lot.type === "depot_vente" ? "Dépôt-vente" : "Rachat"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(lot.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-medium">
                      {formatCurrency(lot.type === "vente" ? lot.total_prix_revente : lot.total_prix_achat)}
                    </span>
                    {lot.type === "depot_vente" && (
                      <p className="text-xs text-muted-foreground">{formatCurrency(lot.total_prix_revente)} prix public</p>
                    )}
                  </div>
                  <LotStatusBadge status={lot.status as LotStatus} outcome={(lot as any).outcome} />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-xs" />}
                      aria-label="Actions"
                    >
                      <DotsThree size={16} weight="regular" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(getLotUrl(lot))}>
                        <Eye size={14} weight="duotone" />
                        Voir le lot
                      </DropdownMenuItem>
                      {dossierStatus === "brouillon" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeletingLotId(lot.id)}
                          >
                            <Trash size={14} weight="duotone" />
                            Supprimer
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {/* Dialog de confirmation suppression lot */}
            <Dialog open={!!deletingLotId} onOpenChange={(open) => { if (!open) setDeletingLotId(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <WarningCircle size={20} weight="duotone" className="text-destructive" />
                    Supprimer le lot
                  </DialogTitle>
                  <DialogDescription>
                    Êtes-vous sûr de vouloir supprimer ce lot et toutes ses références ? Cette action est irréversible.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setDeletingLotId(null)}>
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (deletingLotId) {
                        onDeleteLot(deletingLotId);
                        setDeletingLotId(null);
                      }
                    }}
                  >
                    <Trash size={14} weight="duotone" />
                    Supprimer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
