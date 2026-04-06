"use client";

import { useState } from "react";
import {
  Money,
  CreditCard,
  Bank,
  Check,
  Plus,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Warning,
  Receipt,
  Trash,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
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

const MODE_ICONS: Record<ModeReglement, typeof Money> = {
  especes: Money,
  carte: CreditCard,
  virement: Bank,
  cheque: Check,
};

const MODE_LABELS: Record<ModeReglement, string> = {
  especes: "Especes",
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
  depot_vente: "Net deposant",
};

interface ReglementsCardProps {
  lotId: string;
  reglements: Reglement[];
  paymentsDue: PaymentDue[];
}

export function ReglementsCard({ lotId, reglements, paymentsDue }: ReglementsCardProps) {
  const router = useRouter();
  const [selectedPayment, setSelectedPayment] = useState<PaymentDue | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const unpaidPayments = paymentsDue.filter((p) => !p.is_fully_paid);
  const allPaid = paymentsDue.length > 0 && unpaidPayments.length === 0;

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("reglements").delete().eq("id", deleteId);
    setDeleting(false);
    setDeleteId(null);
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt size={18} weight="duotone" />
            Reglements
            {allPaid && (
              <Badge className="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle size={12} weight="duotone" className="mr-0.5" />
                Tous regles
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alertes pour paiements en attente */}
          {unpaidPayments.map((payment) => (
            <div
              key={payment.type + payment.sens}
              className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Warning size={18} weight="duotone" className="shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{payment.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{payment.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-bold">{formatCurrency(payment.montant_restant)}</span>
                <Button
                  size="sm"
                  onClick={() => setSelectedPayment(payment)}
                >
                  <Plus size={14} weight="bold" />
                  Regler
                </Button>
              </div>
            </div>
          ))}

          {/* Liste des reglements existants */}
          {reglements.length > 0 && (
            <div className="space-y-2">
              {reglements.map((r) => {
                const ModeIcon = MODE_ICONS[r.mode];
                const isSortant = r.sens === "sortant";
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border bg-white dark:bg-card px-4 py-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <ModeIcon size={16} weight="duotone" className="text-muted-foreground" />
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
          )}

          {/* Etat vide */}
          {reglements.length === 0 && unpaidPayments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun règlement enregistré.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'ajout */}
      {selectedPayment && (
        <ReglementDialog
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
          paymentDue={selectedPayment}
          lotId={lotId}
        />
      )}

      {/* Dialog de confirmation suppression */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warning size={20} weight="duotone" className="text-destructive" />
              Supprimer le reglement
            </DialogTitle>
            <DialogDescription>
              Cette action est irreversible. Le reglement sera supprime.
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
