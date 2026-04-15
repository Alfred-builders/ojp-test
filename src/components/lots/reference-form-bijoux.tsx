"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  X,
  Diamond,
  Lightning,
  FileText,
  Info,
  CurrencyEur,
  Receipt,
  Wallet,
} from "@phosphor-icons/react";
import { parse } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  calculerTFOP,
  calculerTPV,
  isTPVEligible,
  regimeFiscalOptimalBijoux,
} from "@/lib/calculations/taxes";
import { formatCurrency, formatDateISO } from "@/lib/format";
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
  commissionDvPct?: number;
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
  commissionDvPct = 40,
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
  const [poidsBrut, setPoidsBrut] = useState(editData?.poids_brut?.toString() ?? editData?.poids?.toString() ?? "");
  const [poidsNet, setPoidsNet] = useState(editData?.poids_net?.toString() ?? editData?.poids?.toString() ?? "");
  const [poidsNetTouched, setPoidsNetTouched] = useState(false);
  const [quantite, setQuantite] = useState(editData?.quantite?.toString() ?? "1");
  const [prixAchatManuel, setPrixAchatManuel] = useState(editData?.prix_achat?.toString() ?? "");
  const [prixReventeManuel, setPrixReventeManuel] = useState(editData?.prix_revente_estime?.toString() ?? "");
  const [commissionLocal, setCommissionLocal] = useState(commissionDvPct.toString());

  // Champs fiscaux (rachat uniquement)
  const [hasFacture, setHasFacture] = useState(editData?.has_facture ?? false);
  const [isScelle, setIsScelle] = useState(editData?.is_scelle ?? false);
  const [dateAcquisition, setDateAcquisition] = useState(editData?.date_acquisition ?? "");
  const [prixAcquisitionStr, setPrixAcquisitionStr] = useState(editData?.prix_acquisition?.toString() ?? "");

  const prixCalcule = useMemo(() => {
    if (!metal || !qualite || !poidsNet) return null;
    const coursMetalGramme = getCoursMetalFromSnapshot(
      metal as "Or" | "Argent" | "Platine",
      coursOrSnapshot,
      coursArgentSnapshot,
      coursPlatineSnapshot
    );
    return calculerPrixRachatBijoux(
      coursMetalGramme,
      parseInt(qualite),
      parseFloat(poidsNet),
      coefficientSnapshot
    );
  }, [metal, qualite, poidsNet, coursOrSnapshot, coursArgentSnapshot, coursPlatineSnapshot, coefficientSnapshot]);

  const commissionPct = parseFloat(commissionLocal) || commissionDvPct;

  const prixVenteCalcule = useMemo(() => {
    if (isDepotVente) {
      const basePrix = prixAchatManuel ? parseFloat(prixAchatManuel) : prixCalcule;
      if (basePrix === null || isNaN(basePrix)) return null;
      const markup = 1 + commissionPct / 100;
      return Math.round(basePrix * markup * 100) / 100;
    }
    if (!metal || !qualite || !poidsNet) return null;
    const coursMetalGramme = getCoursMetalFromSnapshot(
      metal as "Or" | "Argent" | "Platine",
      coursOrSnapshot,
      coursArgentSnapshot,
      coursPlatineSnapshot
    );
    return calculerPrixRachatBijoux(
      coursMetalGramme,
      parseInt(qualite),
      parseFloat(poidsNet),
      coefficientVenteSnapshot
    );
  }, [metal, qualite, poidsNet, coursOrSnapshot, coursArgentSnapshot, coursPlatineSnapshot, coefficientVenteSnapshot, isDepotVente, prixAchatManuel, prixCalcule, commissionPct]);

  // --- Calculs fiscaux (rachat uniquement) ---
  const qty = parseInt(quantite) || 1;
  const prixAchatTotal = (() => {
    const unitaire = prixAchatManuel ? parseFloat(prixAchatManuel) : prixCalcule;
    if (unitaire === null || isNaN(unitaire)) return null;
    return Math.round(unitaire * qty * 100) / 100;
  })();

  const tpvEligible = !isDepotVente && isTPVEligible(
    hasFacture,
    isScelle,
    dateAcquisition || null,
    prixAcquisitionStr ? parseFloat(prixAcquisitionStr) : null
  );

  const tfopMontant = !isDepotVente && prixAchatTotal !== null ? calculerTFOP(prixAchatTotal) : null;
  const tpvMontant = tpvEligible && prixAchatTotal !== null && prixAcquisitionStr
    ? calculerTPV(prixAchatTotal, parseFloat(prixAcquisitionStr), dateAcquisition)
    : null;

  const optimal = !isDepotVente && tfopMontant !== null
    ? regimeFiscalOptimalBijoux(tpvMontant, tfopMontant)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!designation || !metal || !qualite || !poidsBrut || !poidsNet || !quantite) {
      setError("Désignation, métal, qualité, poids brut, poids net et quantité sont requis.");
      return;
    }

    const finalPrixAchat = prixAchatManuel ? parseFloat(prixAchatManuel) : prixCalcule;
    const finalPrixRevente = isDepotVente
      ? (finalPrixAchat !== null && !isNaN(finalPrixAchat) ? Math.round(finalPrixAchat * (1 + commissionPct / 100) * 100) / 100 : null)
      : (prixReventeManuel ? parseFloat(prixReventeManuel) : prixVenteCalcule);

    if (finalPrixAchat === null || isNaN(finalPrixAchat)) {
      setError("Le prix de rachat est requis.");
      return;
    }

    if (!isDepotVente && (finalPrixRevente === null || isNaN(finalPrixRevente))) {
      setError("Le prix de revente est requis.");
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
      poids: parseFloat(poidsNet),
      poids_brut: parseFloat(poidsBrut),
      poids_net: parseFloat(poidsNet),
      quantite: parseInt(quantite) || 1,
      cours_metal_utilise: coursMetalGramme,
      coefficient_utilise: coefficientSnapshot,
      prix_achat: finalPrixAchat,
      prix_revente_estime: finalPrixRevente,
      type_rachat: typeRachat,
      // Champs fiscaux
      has_facture: isDepotVente ? false : hasFacture,
      is_scelle: isDepotVente ? false : isScelle,
      date_acquisition: isDepotVente ? null : (dateAcquisition || null),
      prix_acquisition: isDepotVente ? null : (prixAcquisitionStr ? parseFloat(prixAcquisitionStr) : null),
      tpv_eligible: isDepotVente ? false : tpvEligible,
      tpv_montant: isDepotVente ? null : (tpvMontant !== null ? tpvMontant / qty : null),
      tmp_montant: isDepotVente ? null : (tfopMontant !== null ? tfopMontant / qty : null),
      regime_fiscal: isDepotVente ? null : (optimal?.regime ?? null),
      montant_taxe: isDepotVente ? 0 : ((optimal?.montant ?? 0) / qty),
    };

    const { error: dbError } = isEdit
      ? await supabase.from("lot_references").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editData.id)
      : await supabase.from("lot_references").insert({ ...payload, lot_id: lotId, categorie: "bijoux", status: "en_expertise" });

    if (dbError) {
      toast.error("Erreur lors de l'enregistrement de la référence");
      setError(dbError.message);
      setSaving(false);
      return;
    }

    toast.success(isEdit ? "Référence modifiée" : "Référence ajoutée");
    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Card className="border-border bg-white dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Diamond size={16} weight="duotone" />
          {isEdit ? `Modifier — ${editData.designation}` : "Ajouter un bijoux"}
        </CardTitle>
        <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Fermer">
          <X size={14} weight="regular" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-150">{error}</p>}

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
              <Label htmlFor="designation">Désignation *</Label>
              <Input
                id="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Ex: Bracelet or 18k"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Métal *</Label>
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
              <Label>Qualité *</Label>
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

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="poids_brut">Poids brut (g) *</Label>
              <Input
                id="poids_brut"
                type="number"
                step="0.01"
                min="0.01"
                value={poidsBrut}
                onChange={(e) => {
                  setPoidsBrut(e.target.value);
                  if (!poidsNetTouched) setPoidsNet(e.target.value);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poids_net">Poids net (g) *</Label>
              <Input
                id="poids_net"
                type="number"
                step="0.01"
                min="0.01"
                max={poidsBrut || undefined}
                value={poidsNet}
                onChange={(e) => {
                  setPoidsNet(e.target.value);
                  setPoidsNetTouched(true);
                }}
                required
              />
              <p className="text-xs text-muted-foreground">Poids du métal seul</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantite">Quantité *</Label>
              <Input
                id="quantite"
                type="number"
                step="1"
                min="1"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prix_achat">Prix de rachat *</Label>
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
            {isDepotVente ? (
              <div className="space-y-2">
                <Label htmlFor="commission">Commission (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={commissionLocal}
                  onChange={(e) => setCommissionLocal(e.target.value)}
                />
                {prixVenteCalcule !== null && !isNaN(prixVenteCalcule) && (
                  <p className="text-xs text-muted-foreground">
                    Prix de revente : {formatCurrency(prixVenteCalcule)} (commission : {formatCurrency(prixVenteCalcule - (prixAchatManuel ? parseFloat(prixAchatManuel) : (prixCalcule ?? 0)))})
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="prix_revente">Prix de revente *</Label>
                <Input
                  id="prix_revente"
                  type="number"
                  step="0.01"
                  min="0"
                  value={prixReventeManuel}
                  onChange={(e) => setPrixReventeManuel(e.target.value)}
                  placeholder={prixVenteCalcule !== null ? formatCurrency(prixVenteCalcule) : "—"}
                />
                {prixVenteCalcule !== null && !isNaN(prixVenteCalcule) && (
                  <p className="text-xs text-muted-foreground">
                    Au cours : {formatCurrency(prixVenteCalcule)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Conditions fiscales (rachat uniquement) */}
          {!isDepotVente && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Info size={14} weight="duotone" />
                Conditions fiscales — TFOP (6,5%)
              </p>
              <p className="text-xs text-muted-foreground">
                Taxe forfaitaire sur les objets précieux : 6% + 0,5% CRDS. Exonéré si cession ≤ 5 000 €.
                Le vendeur peut opter pour le régime des plus-values s&apos;il dispose des justificatifs.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={hasFacture} onCheckedChange={(v) => setHasFacture(!!v)} />
                  Facture au nom du client
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={isScelle} onCheckedChange={(v) => setIsScelle(!!v)} />
                  Justificatif d&apos;achat
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date d&apos;acquisition</Label>
                  <DatePicker
                    value={dateAcquisition ? parse(dateAcquisition, "yyyy-MM-dd", new Date()) : undefined}
                    onChange={(d) => setDateAcquisition(d ? formatDateISO(d) : "")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prix_acquisition_bijoux">Prix d&apos;acquisition (€)</Label>
                  <Input
                    id="prix_acquisition_bijoux"
                    type="number"
                    step="0.01"
                    min="0"
                    value={prixAcquisitionStr}
                    onChange={(e) => setPrixAcquisitionStr(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Résultats fiscaux */}
          {!isDepotVente && prixAchatTotal !== null && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CurrencyEur size={12} weight="duotone" />
                  Prix de rachat total
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(prixAchatTotal)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Receipt size={12} weight="duotone" />
                  TFOP (6,5%)
                </p>
                <p className={`text-sm font-medium ${optimal?.regime === "TFOP" ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {tfopMontant !== null ? (tfopMontant === 0 ? "Exonéré (≤ 5 000 €)" : formatCurrency(tfopMontant)) : "—"}
                  {optimal?.regime === "TFOP" && tfopMontant !== null && tfopMontant > 0 && " \u2713"}
                </p>
                {tpvEligible && tpvMontant !== null ? (
                  <>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <Receipt size={12} weight="duotone" />
                      TPV (plus-value)
                    </p>
                    <p className={`text-sm font-medium ${optimal?.regime === "TPV" ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {formatCurrency(tpvMontant)}
                      {optimal?.regime === "TPV" && " \u2713"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mt-2">TPV</p>
                    <p className="text-sm text-muted-foreground">Non éligible</p>
                  </>
                )}
              </div>
              {optimal && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Wallet size={12} weight="duotone" />
                    Montant net
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrency(prixAchatTotal - optimal.montant)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Enregistrement..." : isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
