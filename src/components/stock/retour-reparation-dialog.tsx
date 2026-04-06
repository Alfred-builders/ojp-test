"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface RetourReparationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reparationId: string;
  bijouId: string;
  coutEstime: number | null;
}

export function RetourReparationDialog({
  open,
  onOpenChange,
  reparationId,
  bijouId,
  coutEstime,
}: RetourReparationDialogProps) {
  const router = useRouter();
  const [coutReel, setCoutReel] = useState(coutEstime?.toString() ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    const supabase = createClient();

    const { error: repError } = await mutate(
      supabase
        .from("reparations")
        .update({
          cout_reel: coutReel ? parseFloat(coutReel) : null,
          notes: notes || null,
          date_retour: new Date().toISOString(),
          statut: "terminee",
        })
        .eq("id", reparationId),
      "Erreur lors de la mise à jour de la réparation"
    );
    if (repError) { setSaving(false); return; }

    const { error: stockError } = await mutate(
      supabase
        .from("bijoux_stock")
        .update({ statut: "en_stock", updated_at: new Date().toISOString() })
        .eq("id", bijouId),
      "Erreur lors de la remise en stock du bijou"
    );
    if (stockError) { setSaving(false); return; }

    setSaving(false);
    setCoutReel("");
    setNotes("");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowCounterClockwise size={20} weight="duotone" />
            Récupérer de réparation
          </DialogTitle>
          <DialogDescription>
            Le bijou sera remis en stock après confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="return-cost">Coût réel (EUR)</Label>
            <Input
              id="return-cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={coutReel}
              onChange={(e) => setCoutReel(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="return-notes">Notes</Label>
            <Textarea
              id="return-notes"
              placeholder="Observations sur la réparation effectuée..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <ArrowCounterClockwise size={16} weight="duotone" />
            {saving ? "Confirmation..." : "Confirmer le retour"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
