"use client";

import { useState, useEffect } from "react";
import { Diamond, Coins, Lightning, FileText, DotsThree, PencilSimple, Trash, WarningCircle, ArrowUUpLeft, CheckCircle, XCircle, Timer, Stamp, ArrowCounterClockwise } from "@phosphor-icons/react";
import { usePreviewDrawer } from "@/hooks/use-preview-drawer";
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
import { formatCurrency } from "@/lib/format";
import { REF_STATUS_CONFIG } from "@/components/references/reference-status-config";
import type { LotReference } from "@/types/lot";

interface ReferenceCardProps {
  reference: LotReference;
  onDelete?: (id: string) => void;
  onEdit?: (reference: LotReference) => void;
  onRestituer?: (id: string) => void;
  onValiderRachat?: (id: string) => void;
  onRetracter?: (id: string) => void;
  onAccepterDevis?: (id: string) => void;
  onRefuserDevis?: (id: string) => void;
  canEdit?: boolean;
  canRestituer?: boolean;
  hideTypeRachat?: boolean;
  isDepotVente?: boolean;
}

export function ReferenceCard({ reference, onDelete, onEdit, onRestituer, onValiderRachat, onRetracter, onAccepterDevis, onRefuserDevis, canEdit, canRestituer, hideTypeRachat, isDepotVente }: ReferenceCardProps) {
  const { openPreview } = usePreviewDrawer();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRefuser, setConfirmRefuser] = useState(false);
  const [confirmRetracter, setConfirmRetracter] = useState(false);
  const isBijoux = reference.categorie === "bijoux";
  const statusConfig = REF_STATUS_CONFIG[reference.status];
  const totalPrice = reference.prix_achat * reference.quantite;

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-white dark:bg-card px-4 py-3">
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {isBijoux ? (
          <Diamond size={18} weight="duotone" className="text-muted-foreground" />
        ) : (
          <Coins size={18} weight="duotone" className="text-muted-foreground" />
        )}
      </div>

      {/* Info principale */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="font-medium text-sm truncate text-foreground hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              openPreview("reference", reference.id);
            }}
          >
            {reference.designation}
          </button>
          {!hideTypeRachat && (
            <Badge variant="outline" className={reference.type_rachat === "devis" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"}>
              {reference.type_rachat === "devis" ? (
                <><FileText size={10} weight="duotone" className="mr-0.5" /> Devis</>
              ) : (
                <><Lightning size={10} weight="duotone" className="mr-0.5" /> Direct</>
              )}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {reference.metal && <span>{reference.metal}</span>}
          {reference.qualite && <span>· {reference.qualite}</span>}
          {reference.poids_brut != null && reference.poids_net != null && reference.poids_brut !== reference.poids_net ? (
            <span>· {reference.poids_brut}g (net: {reference.poids_net}g)</span>
          ) : (
            reference.poids_net != null ? <span>· {reference.poids_net}g</span> : reference.poids != null && <span>· {reference.poids}g</span>
          )}
          <span>· ×{reference.quantite}</span>
          <span>· {formatCurrency(reference.prix_achat)}/u</span>
        </div>
      </div>

      {/* Prix total */}
      <div className="text-right shrink-0">
        <p className="text-lg font-bold">{formatCurrency(totalPrice)}</p>
        {isDepotVente && <p className="text-xs text-muted-foreground">net déposant</p>}
      </div>

      {/* Badges */}
      <Badge variant="secondary" className={statusConfig.className}>
        {statusConfig.label}
      </Badge>

      {/* Timer for retractation/devis */}
      {(reference.status === "en_retractation" || reference.status === "devis_envoye") && reference.date_fin_delai && (
        <RefCountdown endDate={new Date(reference.date_fin_delai)} />
      )}

      {/* Rachat actions: Valider / Rétracter after 48h */}
      {reference.status === "en_retractation" && reference.date_fin_delai && onValiderRachat && onRetracter && (
        (() => {
          const canAct = new Date() >= new Date(reference.date_fin_delai);
          return canAct ? (
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={() => onValiderRachat(reference.id)}>
                <Stamp size={14} weight="duotone" />
                Valider
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmRetracter(true)}>
                <ArrowCounterClockwise size={14} weight="duotone" />
                Se rétracte
              </Button>
            </div>
          ) : null;
        })()
      )}

      {/* Devis actions: Accepter / Refuser after 48h */}
      {reference.status === "devis_envoye" && reference.date_fin_delai && onAccepterDevis && onRefuserDevis && (
        (() => {
          const canAct = new Date() >= new Date(reference.date_fin_delai);
          return canAct ? (
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={() => onAccepterDevis(reference.id)}>
                <CheckCircle size={14} weight="duotone" />
                Accepter
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmRefuser(true)}>
                <XCircle size={14} weight="duotone" />
                Refuser
              </Button>
            </div>
          ) : null;
        })()
      )}

      {/* Confirmation dialog: Refuser */}
      <Dialog open={confirmRefuser} onOpenChange={setConfirmRefuser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser le devis</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir refuser le devis pour &quot;{reference.designation}&quot; ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRefuser(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => { setConfirmRefuser(false); onRefuserDevis?.(reference.id); }}>
              <XCircle size={14} weight="duotone" />
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog: Se rétracter */}
      <Dialog open={confirmRetracter} onOpenChange={setConfirmRetracter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rétractation</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir valider la rétractation pour &quot;{reference.designation}&quot; ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRetracter(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => { setConfirmRetracter(false); onRetracter?.(reference.id); }}>
              <ArrowCounterClockwise size={14} weight="duotone" />
              Se rétracte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restitution button for depot-vente */}
      {canRestituer && onRestituer && reference.status === "en_depot_vente" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRestituer(reference.id)}
        >
          <ArrowUUpLeft size={14} weight="duotone" />
          Restituer
        </Button>
      )}

      {/* Menu actions */}
      {canEdit && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-xs" aria-label="Actions" />
              }
            >
              <DotsThree size={16} weight="regular" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(reference)}>
                  <PencilSimple size={14} weight="duotone" />
                  Modifier
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Trash size={14} weight="duotone" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dialog de confirmation */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <WarningCircle size={20} weight="duotone" className="text-destructive" />
                  Supprimer la référence
                </DialogTitle>
                <DialogDescription>
                  Êtes-vous sûr de vouloir supprimer &quot;{reference.designation}&quot; (×{reference.quantite}) ?
                  Cette action est irréversible.
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
                    onDelete?.(reference.id);
                    setConfirmOpen(false);
                  }}
                >
                  <Trash size={14} weight="duotone" />
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function RefCountdown({ endDate }: { endDate: Date }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
      <Timer size={12} weight="duotone" />
      <span>{hours}h {minutes}m</span>
    </div>
  );
}
