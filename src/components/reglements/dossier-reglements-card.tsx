"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Money,
  CreditCard,
  Bank,
  Check,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Warning,
  Trash,
  Plus,
  Package,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ReglementDialog } from "./reglement-dialog";
import { formatDate, formatCurrency } from "@/lib/format";
import type { Reglement, ModeReglement } from "@/types/reglement";
import type { PaymentDue } from "@/lib/reglements/detect-payments-due";
import type { Lot } from "@/types/lot";

const MODE_ICONS: Record<ModeReglement, typeof Money> = {
  especes: Money,
  carte: CreditCard,
  virement: Bank,
  cheque: Check,
};

const MODE_LABELS: Record<ModeReglement, string> = {
  especes: "Espèces",
  carte: "Carte",
  virement: "Virement",
  cheque: "Cheque",
};

const TYPE_LABELS: Record<string, string> = {
  rachat: "Rachat",
  vente: "Vente",
  acompte: "Acompte",
  solde: "Solde",
  fonderie: "Fonderie",
};

interface LotPayments {
  lot: Lot;
  reglements: Reglement[];
  paymentsDue: PaymentDue[];
}

interface DossierReglementsCardProps {
  lotsPayments: LotPayments[];
}

export function DossierReglementsCard({ lotsPayments }: DossierReglementsCardProps) {
  const router = useRouter();
  const [selectedPayment, setSelectedPayment] = useState<{ payment: PaymentDue; lotId: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Aggregate
  const allReglements = lotsPayments.flatMap((lp) => lp.reglements);
  const allUnpaid = lotsPayments.flatMap((lp) =>
    lp.paymentsDue.filter((p) => !p.is_fully_paid).map((p) => ({ payment: p, lot: lp.lot }))
  );
  const allPaid = allUnpaid.length === 0 && allReglements.length > 0;


  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("reglements").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erreur lors de la suppression du règlement");
    } else {
      toast.success("Règlement supprimé");
    }
    setDeleting(false);
    setDeleteId(null);
    router.refresh();
  }

  if (allReglements.length === 0 && allUnpaid.length === 0) return null;

  return (
    <>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt size={18} weight="duotone" />
            Règlements du dossier
            {allPaid && (
              <Badge className="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle size={12} weight="duotone" className="mr-0.5" />
                Tous réglés
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unpaid alerts */}
          {allUnpaid.map(({ payment, lot }) => (
            <div
              key={`${lot.id}-${payment.type}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Warning size={18} weight="duotone" className="shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{payment.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Lot {lot.numero} · {payment.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-bold">{formatCurrency(payment.montant_restant)}</span>
                <Button
                  size="sm"
                  onClick={() => setSelectedPayment({ payment, lotId: lot.id })}
                >
                  <Plus size={14} weight="bold" />
                  Régler
                </Button>
              </div>
            </div>
          ))}

          {/* Reglements list grouped by lot */}
          {lotsPayments
            .filter((lp) => lp.reglements.length > 0)
            .map((lp) => (
              <div key={lp.lot.id} className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <Package size={12} weight="duotone" />
                  <span>Lot {lp.lot.numero}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {lp.lot.type === "rachat" ? "Rachat" : lp.lot.type === "vente" ? "Vente" : "Dépôt-vente"}
                  </Badge>
                </div>
                {lp.reglements.map((r) => {
                  const ModeIcon = MODE_ICONS[r.mode];
                  const isSortant = r.sens === "sortant";
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-lg border bg-white dark:bg-card px-4 py-2"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                        <ModeIcon size={14} weight="duotone" className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{TYPE_LABELS[r.type] ?? r.type}</span>
                          <Badge
                            variant="secondary"
                            className={
                              isSortant
                                ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                            }
                          >
                            {isSortant ? (
                              <><ArrowUp size={8} weight="bold" className="mr-0.5" /> Sortant</>
                            ) : (
                              <><ArrowDown size={8} weight="bold" className="mr-0.5" /> Entrant</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{formatDate(r.date_reglement)}</span>
                          <span>·</span>
                          <span>{MODE_LABELS[r.mode]}</span>
                          {r.notes && (
                            <>
                              <span>·</span>
                              <span className="truncate">{r.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${isSortant ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {isSortant ? "-" : "+"}{formatCurrency(r.montant)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(r.id)}
                        aria-label="Actions"
                      >
                        <Trash size={14} weight="duotone" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Dialog d'ajout */}
      {selectedPayment && (
        <ReglementDialog
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
          paymentDue={selectedPayment.payment}
          lotId={selectedPayment.lotId}
        />
      )}

      {/* Dialog suppression */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warning size={20} weight="duotone" className="text-destructive" />
              Supprimer le règlement
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le règlement sera supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
              <Trash size={14} weight="duotone" />
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
