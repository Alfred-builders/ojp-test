"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "@phosphor-icons/react";
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

interface EnvoiReparationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bijouId: string;
}

export function EnvoiReparationDialog({
  open,
  onOpenChange,
  bijouId,
}: EnvoiReparationDialogProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [coutEstime, setCoutEstime] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    const supabase = createClient();

    const { error: insertError } = await mutate(
      supabase.from("reparations").insert({
        bijou_id: bijouId,
        description: description || null,
        cout_estime: coutEstime ? parseFloat(coutEstime) : null,
      }),
      "Erreur lors de la création de la réparation"
    );
    if (insertError) { setSaving(false); return; }

    const { error: updateError } = await mutate(
      supabase
        .from("bijoux_stock")
        .update({ statut: "en_reparation", updated_at: new Date().toISOString() })
        .eq("id", bijouId),
      "Erreur lors de la mise à jour du statut du bijou"
    );
    if (updateError) { setSaving(false); return; }

    setSaving(false);
    setDescription("");
    setCoutEstime("");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench size={20} weight="duotone" />
            Envoyer en réparation
          </DialogTitle>
          <DialogDescription>
            Le bijou sera marqué comme indisponible pendant la réparation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="repair-description">Description de la réparation</Label>
            <Textarea
              id="repair-description"
              placeholder="Ex : Remplacement du fermoir, polissage..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="repair-cost">Coût estimé (EUR)</Label>
            <Input
              id="repair-cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={coutEstime}
              onChange={(e) => setCoutEstime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Wrench size={16} weight="duotone" />
            {saving ? "Envoi..." : "Envoyer en réparation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
