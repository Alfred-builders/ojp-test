"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flask, Check } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { BonLivraison } from "@/types/bon-livraison";

interface LigneState {
  id: string;
  designation: string;
  titrage_declare: string;
  poids_declare: number;
  cours_utilise: number;
  valeur_estimee: number;
  titrage_reel: string;
  poids_reel: string;
  ecart_notes: string;
}

interface EcartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bdl: BonLivraison;
}

export function EcartDialog({ open, onOpenChange, bdl }: EcartDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const lignes = bdl.lignes ?? [];
  const readOnly = bdl.statut === "traite";

  const [state, setState] = useState<LigneState[]>(() =>
    lignes.map((l) => ({
      id: l.id,
      designation: l.designation,
      titrage_declare: l.titrage_declare ?? "",
      poids_declare: l.poids_declare ?? 0,
      cours_utilise: l.cours_utilise ?? 0,
      valeur_estimee: l.valeur_estimee ?? 0,
      titrage_reel: l.titrage_reel ?? "",
      poids_reel: l.poids_reel != null ? String(l.poids_reel) : "",
      ecart_notes: l.ecart_notes ?? "",
    })),
  );

  function updateLigne(index: number, field: keyof LigneState, value: string) {
    setState((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    );
  }

  function computeValeurReelle(l: LigneState): number | null {
    const titrageReel = parseInt(l.titrage_reel) || 0;
    const poidsReel = parseFloat(l.poids_reel) || 0;
    if (!titrageReel || !poidsReel) return null;
    // cours_utilise is already per gram at declared titrage, so recalculate from base
    // base cours = cours_utilise / (titrage_declare/1000)
    const titrDeclare = parseInt(l.titrage_declare) || 1;
    const coursBase = l.cours_utilise / (titrDeclare / 1000);
    return Math.round(poidsReel * coursBase * (titrageReel / 1000) * 100) / 100;
  }

  function computeEcart(l: LigneState): number | null {
    const valReel = computeValeurReelle(l);
    if (valReel == null) return null;
    return Math.round((valReel - l.valeur_estimee) * 100) / 100;
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    for (const l of state) {
      const titrageReel = l.titrage_reel || null;
      const poidsReel = l.poids_reel ? parseFloat(l.poids_reel) : null;
      const valeurReelle = computeValeurReelle(l);
      const ecartTitrage = titrageReel != null && titrageReel !== l.titrage_declare;
      const ecartPoids = poidsReel != null && poidsReel !== l.poids_declare;

      await supabase
        .from("bon_livraison_lignes")
        .update({
          titrage_reel: titrageReel,
          poids_reel: poidsReel,
          valeur_reelle: valeurReelle,
          ecart_titrage: ecartTitrage,
          ecart_poids: ecartPoids,
          ecart_notes: l.ecart_notes || null,
          date_test: new Date().toISOString(),
        })
        .eq("id", l.id);
    }

    // Mark BDL as traité
    await supabase.from("bons_livraison").update({
      statut: "traite",
      date_traitement: new Date().toISOString(),
    }).eq("id", bdl.id);

    setSaving(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flask size={20} weight="duotone" />
            Résultats fonderie — {bdl.numero}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Résultats enregistrés par la fonderie."
              : "Saisissez le titrage et poids réels constatés par la fonderie."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead className="text-center">Titrage déclaré</TableHead>
                <TableHead className="text-center">Titrage réel</TableHead>
                <TableHead className="text-right">Poids déclaré</TableHead>
                <TableHead className="text-right">Poids réel</TableHead>
                <TableHead className="text-right">Écart valeur</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.map((l, i) => {
                const ecart = computeEcart(l);

                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm max-w-[160px] truncate">
                      {l.designation}
                    </TableCell>
                    <TableCell className="text-center">{l.titrage_declare}</TableCell>
                    <TableCell className="text-center">
                      {readOnly ? (
                        <span className={l.titrage_reel !== l.titrage_declare ? "text-amber-600 font-medium" : ""}>
                          {l.titrage_reel || "—"}
                        </span>
                      ) : (
                        <Input
                          className="w-20 h-7 text-center mx-auto"
                          placeholder="750"
                          value={l.titrage_reel}
                          onChange={(e) => updateLigne(i, "titrage_reel", e.target.value)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">{l.poids_declare}g</TableCell>
                    <TableCell className="text-right">
                      {readOnly ? (
                        <span className={parseFloat(l.poids_reel) !== l.poids_declare ? "text-amber-600 font-medium" : ""}>
                          {l.poids_reel ? `${l.poids_reel}g` : "—"}
                        </span>
                      ) : (
                        <Input
                          className="w-24 h-7 text-right ml-auto"
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          value={l.poids_reel}
                          onChange={(e) => updateLigne(i, "poids_reel", e.target.value)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {ecart != null ? (
                        <Badge
                          variant="secondary"
                          className={
                            ecart > 0
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : ecart < 0
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : ""
                          }
                        >
                          {ecart > 0 ? "+" : ""}{formatCurrency(ecart)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        <span className="text-sm text-muted-foreground">{l.ecart_notes || "—"}</span>
                      ) : (
                        <Input
                          className="h-7 text-sm min-w-[100px]"
                          placeholder="Notes..."
                          value={l.ecart_notes}
                          onChange={(e) => updateLigne(i, "ecart_notes", e.target.value)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Fermer" : "Annuler"}
          </Button>
          {!readOnly && (
            <Button disabled={saving} onClick={handleSave}>
              <Check size={14} weight="bold" />
              {saving ? "Enregistrement..." : "Valider les résultats"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
