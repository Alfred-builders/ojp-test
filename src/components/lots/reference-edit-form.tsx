"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FloppyDisk, X, Lightning, FileText } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PencilSimple } from "@phosphor-icons/react";
import type { LotReference } from "@/types/lot";

interface ReferenceEditFormProps {
  reference: LotReference;
  onClose: () => void;
}

export function ReferenceEditForm({ reference, onClose }: ReferenceEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [designation, setDesignation] = useState(reference.designation);
  const [metal, setMetal] = useState(reference.metal ?? "");
  const [qualite, setQualite] = useState(reference.qualite ?? "");
  const [poids, setPoids] = useState(reference.poids?.toString() ?? "");
  const [quantite, setQuantite] = useState(reference.quantite.toString());
  const [typeRachat, setTypeRachat] = useState<"direct" | "devis">(reference.type_rachat);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!designation) {
      setError("La désignation est requise.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("lot_references")
      .update({
        designation,
        metal: metal || null,
        qualite: qualite || null,
        poids: poids ? parseFloat(poids) : null,
        quantite: parseInt(quantite) || 1,
        type_rachat: typeRachat,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reference.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  const isBijoux = reference.categorie === "bijoux";

  return (
    <Card className="border-primary/30 bg-white dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <PencilSimple size={16} weight="duotone" />
          Modifier — {reference.designation}
        </CardTitle>
        <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Fermer">
          <X size={14} weight="regular" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTypeRachat("direct")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                typeRachat === "direct"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lightning size={14} weight="duotone" />
              Rachat direct
            </button>
            <button
              type="button"
              onClick={() => setTypeRachat("devis")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                typeRachat === "devis"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText size={14} weight="duotone" />
              Devis
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Désignation</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
              />
            </div>
            {isBijoux && (
              <>
                <div className="space-y-2">
                  <Label>Métal</Label>
                  <Select value={metal} onValueChange={(v) => { if (v) setMetal(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Or">Or</SelectItem>
                      <SelectItem value="Argent">Argent</SelectItem>
                      <SelectItem value="Platine">Platine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Qualité</Label>
                  <Select value={qualite} onValueChange={(v) => { if (v) setQualite(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="333">333</SelectItem>
                      <SelectItem value="375">375</SelectItem>
                      <SelectItem value="585">585</SelectItem>
                      <SelectItem value="750">750</SelectItem>
                      <SelectItem value="999">999</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {isBijoux && (
              <div className="space-y-2">
                <Label>Poids (g)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={poids}
                  onChange={(e) => setPoids(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Quantité</Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
