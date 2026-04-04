"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FloppyDisk, X, Diamond, Lightning, FileText } from "@phosphor-icons/react";
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
import { METAL_OPTIONS, QUALITE_OPTIONS } from "@/lib/validations/lot";
import {
  calculerPrixRachatBijoux,
  getCoursMetalFromSnapshot,
} from "@/lib/calculations/prix-rachat";
import type { LotReference } from "@/types/lot";

interface ReferenceFormBijouxProps {
  lotId: string;
  coursOrSnapshot: number;
  coursArgentSnapshot: number;
  coursPlatineSnapshot: number;
  coefficientSnapshot: number;
  coefficientVenteSnapshot: number;
  onClose: () => void;
  editData?: LotReference;
  lotType?: "rachat" | "depot_vente";
}

export function ReferenceFormBijoux({
  lotId,
  coursOrSnapshot,
  coursArgentSnapshot,
  coursPlatineSnapshot,
  coefficientSnapshot,
  coefficientVenteSnapshot,
  onClose,
  editData,
  lotType = "rachat",
}: ReferenceFormBijouxProps) {
  const isDepotVente = lotType === "depot_vente";
  const isEdit = !!editData;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [typeRachat, setTypeRachat] = useState<"direct" | "devis">(editData?.type_rachat ?? "direct");
  const [designation, setDesignation] = useState(editData?.designation ?? "");
  const [metal, setMetal] = useState<"Or" | "Argent" | "Platine" | "">(editData?.metal ?? "");
  const [qualite, setQualite] = useState(editData?.qualite ?? "");
  const [poids, setPoids] = useState(editData?.poids?.toString() ?? "");
  const [quantite, setQuantite] = useState(editData?.quantite?.toString() ?? "1");
  const [prixAchatManuel, setPrixAchatManuel] = useState(editData?.prix_achat?.toString() ?? "");
  const [prixReventeManuel, setPrixReventeManuel] = useState(editData?.prix_revente_estime?.toString() ?? "");

  const prixCalcule = useMemo(() => {
    if (!metal || !qualite || !poids) return null;
    const coursMetalGramme = getCoursMetalFromSnapshot(
      metal as "Or" | "Argent" | "Platine",
      coursOrSnapshot,
      coursArgentSnapshot,
      coursPlatineSnapshot
    );
    return calculerPrixRachatBijoux(
      coursMetalGramme,
      parseInt(qualite),
      parseFloat(poids),
      coefficientSnapshot
    );
  }, [metal, qualite, poids, coursOrSnapshot, coursArgentSnapshot, coursPlatineSnapshot, coefficientSnapshot]);

  const prixVenteCalcule = useMemo(() => {
    if (isDepotVente) {
      // Depot-vente: prix_revente = prix_achat × 1.4
      const basePrix = prixAchatManuel ? parseFloat(prixAchatManuel) : prixCalcule;
      if (basePrix === null || isNaN(basePrix)) return null;
      return Math.round(basePrix * 1.4 * 100) / 100;
    }
    if (!metal || !qualite || !poids) return null;
    const coursMetalGramme = getCoursMetalFromSnapshot(
      metal as "Or" | "Argent" | "Platine",
      coursOrSnapshot,
      coursArgentSnapshot,
      coursPlatineSnapshot
    );
    return calculerPrixRachatBijoux(
      coursMetalGramme,
      parseInt(qualite),
      parseFloat(poids),
      coefficientVenteSnapshot
    );
  }, [metal, qualite, poids, coursOrSnapshot, coursArgentSnapshot, coursPlatineSnapshot, coefficientVenteSnapshot, isDepotVente, prixAchatManuel, prixCalcule]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!designation || !metal || !qualite || !poids) {
      setError("Tous les champs sont requis.");
      return;
    }

    const finalPrixAchat = prixAchatManuel ? parseFloat(prixAchatManuel) : prixCalcule;
    const finalPrixRevente = isDepotVente
      ? (finalPrixAchat !== null && !isNaN(finalPrixAchat) ? Math.round(finalPrixAchat * 1.4 * 100) / 100 : null)
      : (prixReventeManuel ? parseFloat(prixReventeManuel) : prixVenteCalcule);

    if (finalPrixAchat === null || isNaN(finalPrixAchat)) {
      setError("Le prix de rachat est requis.");
      return;
    }

    setSaving(true);
    const coursMetalGramme = getCoursMetalFromSnapshot(
      metal as "Or" | "Argent" | "Platine",
      coursOrSnapshot,
      coursArgentSnapshot,
      coursPlatineSnapshot
    );

    const supabase = createClient();
    const payload = {
      designation,
      metal,
      qualite,
      poids: parseFloat(poids),
      quantite: parseInt(quantite) || 1,
      cours_metal_utilise: coursMetalGramme,
      coefficient_utilise: coefficientSnapshot,
      prix_achat: finalPrixAchat,
      prix_revente_estime: finalPrixRevente,
      type_rachat: typeRachat,
    };

    const { error: dbError } = isEdit
      ? await supabase.from("lot_references").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editData.id)
      : await supabase.from("lot_references").insert({ ...payload, lot_id: lotId, categorie: "bijoux", status: "en_expertise" });

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
  }

  return (
    <Card className="border-border bg-white dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Diamond size={16} weight="duotone" />
          {isEdit ? `Modifier — ${editData.designation}` : "Ajouter un bijoux"}
        </CardTitle>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X size={14} weight="regular" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {!isDepotVente && (
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
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="designation">Désignation</Label>
              <Input
                id="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Ex: Bracelet or 18k"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Métal</Label>
              <Select value={metal} onValueChange={(v) => { if (v) setMetal(v as "Or" | "Argent" | "Platine"); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {METAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
                  {QUALITE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="poids">Poids (g)</Label>
              <Input
                id="poids"
                type="number"
                step="0.01"
                min="0.01"
                value={poids}
                onChange={(e) => setPoids(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantite">Quantité</Label>
              <Input
                id="quantite"
                type="number"
                step="1"
                min="1"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prix_achat">Prix de rachat</Label>
              <Input
                id="prix_achat"
                type="number"
                step="0.01"
                min="0"
                value={prixAchatManuel}
                onChange={(e) => setPrixAchatManuel(e.target.value)}
                placeholder={prixCalcule !== null ? formatCurrency(prixCalcule) : "—"}
              />
              {prixCalcule !== null && !isNaN(prixCalcule) && (
                <p className="text-xs text-muted-foreground">
                  Au cours : {formatCurrency(prixCalcule)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prix_revente">Prix de revente</Label>
              <Input
                id="prix_revente"
                type="number"
                step="0.01"
                min="0"
                value={isDepotVente ? "" : prixReventeManuel}
                onChange={(e) => setPrixReventeManuel(e.target.value)}
                placeholder={prixVenteCalcule !== null ? formatCurrency(prixVenteCalcule) : "—"}
                readOnly={isDepotVente}
                className={isDepotVente ? "bg-muted" : ""}
              />
              {isDepotVente && prixVenteCalcule !== null && !isNaN(prixVenteCalcule) && (
                <p className="text-xs text-cyan-600 dark:text-cyan-400">
                  Commission 40% : {formatCurrency(prixVenteCalcule - (prixAchatManuel ? parseFloat(prixAchatManuel) : (prixCalcule ?? 0)))}
                </p>
              )}
              {!isDepotVente && prixVenteCalcule !== null && !isNaN(prixVenteCalcule) && (
                <p className="text-xs text-muted-foreground">
                  Au cours : {formatCurrency(prixVenteCalcule)}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Sauvegarde..." : isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
