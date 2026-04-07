"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CurrencyEur, CreditCard, Bank, Money, Check, FloppyDisk, ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import type { PaymentDue } from "@/lib/reglements/detect-payments-due";
import { formatCurrency } from "@/lib/format";
import type { ModeReglement } from "@/types/reglement";

const MODE_OPTIONS: { value: ModeReglement; label: string; icon: typeof Money }[] = [
  { value: "especes", label: "Especes", icon: Money },
  { value: "carte", label: "Carte bancaire", icon: CreditCard },
  { value: "virement", label: "Virement", icon: Bank },
  { value: "cheque", label: "Cheque", icon: Check },
];

interface ReglementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentDue: PaymentDue;
  lotId: string;
}

export function ReglementDialog({ open, onOpenChange, paymentDue, lotId }: ReglementDialogProps) {
  const router = useRouter();
  const [montant, setMontant] = useState(paymentDue.pre_fill.montant.toString());
  const [mode, setMode] = useState<ModeReglement | "">("");
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSortant = paymentDue.sens === "sortant";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!mode) {
      setError("Le mode de reglement est requis.");
      return;
    }

    const montantNum = parseFloat(montant);
    if (!montantNum || montantNum <= 0) {
      setError("Le montant doit etre positif.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("reglements").insert({
      lot_id: lotId,
      bon_commande_id: paymentDue.pre_fill.bon_commande_id ?? null,
      sens: paymentDue.sens,
      type: paymentDue.type,
      montant: montantNum,
      mode,
      date_reglement: date.toISOString(),
      client_id: paymentDue.pre_fill.client_id ?? null,
      fonderie_id: paymentDue.pre_fill.fonderie_id ?? null,
      notes: notes || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    toast.success("Règlement enregistré");

    const newTotal = paymentDue.montant_deja_paye + montantNum;
    const isFullyPaid = newTotal >= paymentDue.montant_attendu - 0.01;

    // If fonderie payment covers the full amount, update bon_commande statut
    if (paymentDue.type === "fonderie" && paymentDue.pre_fill.bon_commande_id) {
      if (isFullyPaid) {
        const { error: bdcError } = await supabase
          .from("bons_commande")
          .update({ statut: "paye", updated_at: new Date().toISOString() })
          .eq("id", paymentDue.pre_fill.bon_commande_id);
        if (bdcError) { toast.error("Erreur lors de la mise à jour du bon de commande"); }
      }
    }

    // Update document status when payment covers the full amount
    const docTypeMap: Record<string, string> = {
      vente: "facture_vente",
      acompte: "facture_acompte",
      solde: "facture_solde",
      rachat: "quittance_rachat",
      depot_vente: "quittance_depot_vente",
    };
    const docType = docTypeMap[paymentDue.type];
    if (docType && isFullyPaid) {
      await supabase
        .from("documents")
        .update({ status: "regle" })
        .eq("lot_id", lotId)
        .eq("type", docType)
        .neq("status", "regle");
    }

    setSaving(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CurrencyEur size={20} weight="duotone" />
            Enregistrer un reglement
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={
                isSortant
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              }
            >
              {isSortant ? (
                <><ArrowUp size={10} weight="bold" className="mr-0.5" /> Sortant</>
              ) : (
                <><ArrowDown size={10} weight="bold" className="mr-0.5" /> Entrant</>
              )}
            </Badge>
            {paymentDue.label}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-150">{error}</p>}

          {/* Info box */}
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            <p className="text-muted-foreground">{paymentDue.description}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Montant attendu</span>
              <span className="font-semibold">{formatCurrency(paymentDue.montant_attendu)}</span>
            </div>
            {paymentDue.montant_deja_paye > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Deja regle</span>
                <span className="text-emerald-600 font-medium">
                  {formatCurrency(paymentDue.montant_deja_paye)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border mt-1 pt-1">
              <span className="font-medium">Reste a regler</span>
              <span className="font-bold text-base">{formatCurrency(paymentDue.montant_restant)}</span>
            </div>
          </div>

          {/* Montant */}
          <div className="space-y-2">
            <Label>Montant</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
          </div>

          {/* Mode de reglement */}
          <div className="space-y-2">
            <Label>Mode de reglement</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ModeReglement)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un mode" />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Icon size={14} weight="duotone" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date du reglement</Label>
            <DatePicker value={date} onChange={(d) => d && setDate(d)} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Reference, commentaire..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={saving || !mode}>
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
