"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  X,
  Coins,
  Info,
  MagnifyingGlass,
  Check,
  CurrencyEur,
  Receipt,
  Wallet,
  CaretUpDown,
  Lightning,
  FileText,
} from "@phosphor-icons/react";
import { parse } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  calculerPrixRachatOrInvest,
  getCoursMetalFromSnapshot,
} from "@/lib/calculations/prix-rachat";
import {
  calculerTMP,
  calculerTPV,
  isTPVEligible,
  regimeFiscalOptimal,
} from "@/lib/calculations/taxes";
import type { OrInvestissement } from "@/types/or-investissement";
import { formatCurrency, formatDateISO } from "@/lib/format";
import type { LotReference } from "@/types/lot";

interface ReferenceFormOrInvestProps {
  lotId: string;
  coursOrSnapshot: number;
  coursArgentSnapshot: number;
  coursPlatineSnapshot: number;
  coefficientRachatSnapshot: number;
  coefficientVenteSnapshot: number;
  catalog: OrInvestissement[];
  onClose: () => void;
  editData?: LotReference;
}

export function ReferenceFormOrInvest({
  lotId,
  coursOrSnapshot,
  coursArgentSnapshot,
  coursPlatineSnapshot,
  coefficientRachatSnapshot,
  coefficientVenteSnapshot,
  catalog,
  onClose,
  editData,
}: ReferenceFormOrInvestProps) {
  const isEdit = !!editData;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fallback: si les snapshots du lot sont à 0, récupérer les paramètres actuels
  const [liveCoursOr, setLiveCoursOr] = useState(coursOrSnapshot);
  const [liveCoursArgent, setLiveCoursArgent] = useState(coursArgentSnapshot);
  const [liveCoursPlatine, setLiveCoursPlatine] = useState(coursPlatineSnapshot);
  const [liveCoeffRachat, setLiveCoeffRachat] = useState(coefficientRachatSnapshot);
  const [liveCoeffVente, setLiveCoeffVente] = useState(coefficientVenteSnapshot);

  useEffect(() => {
    if (coursOrSnapshot === 0 && coursArgentSnapshot === 0) {
      async function fetchParametres() {
        const supabase = createClient();
        const { data } = await supabase.from("parametres").select("*").single();
        if (data) {
          setLiveCoursOr(data.prix_or ?? 0);
          setLiveCoursArgent(data.prix_argent ?? 0);
          setLiveCoursPlatine(data.prix_platine ?? 0);
          setLiveCoeffRachat(data.coefficient_rachat ?? 0);
          setLiveCoeffVente(data.coefficient_vente ?? 0);

          // Mettre à jour les snapshots du lot
          const supabase2 = createClient();
          await mutate(
            supabase2.from("lots").update({
              cours_or_snapshot: data.prix_or,
              cours_argent_snapshot: data.prix_argent,
              cours_platine_snapshot: data.prix_platine,
              coefficient_rachat_snapshot: data.coefficient_rachat,
              coefficient_vente_snapshot: data.coefficient_vente,
            }).eq("id", lotId),
            "Erreur lors de la mise à jour des cours du lot",
            "Référence ajoutée"
          );
        }
      }
      fetchParametres();
    }
  }, [coursOrSnapshot, coursArgentSnapshot, lotId]);

  const [typeRachat, setTypeRachat] = useState<"direct" | "devis">(editData?.type_rachat ?? "direct");
  const [selectedId, setSelectedId] = useState(editData?.or_investissement_id ?? "");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [isScelle, setIsScelle] = useState(editData?.is_scelle ?? false);
  const [hasFacture, setHasFacture] = useState(editData?.has_facture ?? false);
  const [dateAcquisition, setDateAcquisition] = useState(editData?.date_acquisition ?? "");
  const [prixAcquisition, setPrixAcquisition] = useState(editData?.prix_acquisition?.toString() ?? "");
  const [quantite, setQuantite] = useState(editData?.quantite?.toString() ?? "1");

  const selectedItem = catalog.find((c) => c.id === selectedId);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch) return catalog;
    const q = catalogSearch.toLowerCase();
    return catalog.filter(
      (item) =>
        item.designation.toLowerCase().includes(q) ||
        item.metal?.toLowerCase().includes(q) ||
        item.pays?.toLowerCase().includes(q)
    );
  }, [catalog, catalogSearch]);

  const metal = selectedItem?.metal as "Or" | "Argent" | "Platine" | null;
  const poids = selectedItem?.poids ?? 0;

  const qty = parseInt(quantite) || 1;

  const prixRachat = (() => {
    if (!metal || !poids) return null;
    const cours = getCoursMetalFromSnapshot(metal, liveCoursOr, liveCoursArgent, liveCoursPlatine);
    return Math.round(calculerPrixRachatOrInvest(cours, poids, liveCoeffRachat) * qty * 100) / 100;
  })();

  const prixVente = (() => {
    if (!metal || !poids) return null;
    const cours = getCoursMetalFromSnapshot(metal, liveCoursOr, liveCoursArgent, liveCoursPlatine);
    return Math.round(calculerPrixRachatOrInvest(cours, poids, liveCoeffVente) * qty * 100) / 100;
  })();

  const tpvEligible = isTPVEligible(
    hasFacture,
    isScelle,
    dateAcquisition || null,
    prixAcquisition ? parseFloat(prixAcquisition) : null
  );

  const tmpMontant = prixRachat !== null ? calculerTMP(prixRachat) : null;
  const tpvMontant = tpvEligible && prixRachat !== null && prixAcquisition
    ? calculerTPV(prixRachat, parseFloat(prixAcquisition), dateAcquisition)
    : null;

  const optimal = tmpMontant !== null
    ? regimeFiscalOptimal(tpvMontant, tmpMontant)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedId || !selectedItem) {
      setError("Veuillez sélectionner une pièce du catalogue.");
      return;
    }

    if (prixRachat === null) {
      setError("Impossible de calculer le prix.");
      return;
    }

    setSaving(true);
    const cours = metal ? getCoursMetalFromSnapshot(metal, liveCoursOr, liveCoursArgent, liveCoursPlatine) : 0;

    const supabase = createClient();
    const payload = {
      designation: selectedItem.designation,
      metal: selectedItem.metal,
      poids: selectedItem.poids,
      or_investissement_id: selectedItem.id,
      is_scelle: isScelle,
      has_facture: hasFacture,
      date_acquisition: dateAcquisition || null,
      prix_acquisition: prixAcquisition ? parseFloat(prixAcquisition) : null,
      quantite: parseInt(quantite) || 1,
      cours_metal_utilise: cours,
      coefficient_utilise: liveCoeffRachat,
      prix_achat: prixRachat !== null ? prixRachat / qty : null,
      prix_revente_estime: prixVente !== null ? prixVente / qty : null,
      tpv_eligible: tpvEligible,
      tpv_montant: tpvMontant !== null ? tpvMontant / qty : null,
      tmp_montant: tmpMontant !== null ? tmpMontant / qty : null,
      regime_fiscal: optimal?.regime ?? "TMP",
      montant_taxe: (optimal?.montant ?? 0) / qty,
      type_rachat: typeRachat,
    };

    const { error: dbError } = isEdit
      ? await supabase.from("lot_references").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editData.id)
      : await supabase.from("lot_references").insert({ ...payload, lot_id: lotId, categorie: "or_investissement", status: "en_expertise" });

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
          <Coins size={16} weight="duotone" />
          {isEdit ? `Modifier — ${editData.designation}` : "Ajouter de l\u0027or investissement"}
        </CardTitle>
        <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Fermer">
          <X size={14} weight="regular" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-150">{error}</p>}

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

          {/* Catalog selection with search */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>Pièce / Lingot</Label>
              <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                      type="button"
                    />
                  }
                >
                  <span className={selectedItem ? "text-foreground" : "text-muted-foreground"}>
                    {selectedItem
                      ? `${selectedItem.designation} — ${selectedItem.metal} (${selectedItem.poids}g)`
                      : "Rechercher dans le catalogue..."}
                  </span>
                  <CaretUpDown size={14} weight="regular" className="text-muted-foreground shrink-0" />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <MagnifyingGlass
                        size={14}
                        weight="regular"
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        placeholder="Rechercher..."
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {filteredCatalog.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun résultat.
                      </p>
                    ) : (
                      filteredCatalog.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-sm hover:bg-muted cursor-pointer text-left"
                          onClick={() => {
                            setSelectedId(item.id);
                            setCatalogOpen(false);
                            setCatalogSearch("");
                          }}
                        >
                          <Check
                            size={14}
                            weight="bold"
                            className={selectedId === item.id ? "text-primary" : "opacity-0"}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{item.designation}</span>
                            <span className="text-muted-foreground ml-1.5">
                              — {item.metal} {item.poids ? `(${item.poids}g)` : ""}
                              {item.pays ? ` — ${item.pays}` : ""}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantite_or">Quantité</Label>
              <Input
                id="quantite_or"
                type="number"
                step="1"
                min="1"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
              />
            </div>
          </div>

          {/* Tax conditions */}
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Info size={14} weight="duotone" />
              Conditions fiscales
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={hasFacture} onCheckedChange={(v) => setHasFacture(!!v)} />
                Facture au nom du client
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={isScelle} onCheckedChange={(v) => setIsScelle(!!v)} />
                Pièce sous scellés
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
                <Label htmlFor="prix_acquisition">Prix d&apos;acquisition (€)</Label>
                <Input
                  id="prix_acquisition"
                  type="number"
                  step="0.01"
                  min="0"
                  value={prixAcquisition}
                  onChange={(e) => setPrixAcquisition(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Price + Tax results in cards */}
          {prixRachat !== null && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CurrencyEur size={12} weight="duotone" />
                  Prix de rachat
                </p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(prixRachat)}
                </p>
              </div>
              {prixVente !== null && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CurrencyEur size={12} weight="duotone" />
                    Prix de vente
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrency(prixVente)}
                  </p>
                </div>
              )}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Receipt size={12} weight="duotone" />
                  TMP (11.5%)
                </p>
                <p className={`text-sm font-medium ${optimal?.regime === "TMP" ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {tmpMontant !== null ? formatCurrency(tmpMontant) : "—"}
                  {optimal?.regime === "TMP" && " ✓"}
                </p>
                {tpvEligible && tpvMontant !== null ? (
                  <>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <Receipt size={12} weight="duotone" />
                      TPV (plus-value)
                    </p>
                    <p className={`text-sm font-medium ${optimal?.regime === "TPV" ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {formatCurrency(tpvMontant)}
                      {optimal?.regime === "TPV" && " ✓"}
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
                    {formatCurrency(prixRachat - optimal.montant)}
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
