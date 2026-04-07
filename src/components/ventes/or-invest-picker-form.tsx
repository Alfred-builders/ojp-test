"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  X,
  Coins,
  MagnifyingGlass,
  Check,
  CaretUpDown,
  CurrencyEur,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatCurrency } from "@/lib/format";
import type { OrInvestissement } from "@/types/or-investissement";

interface OrInvestPickerFormProps {
  lotId: string;
  onClose: () => void;
  coursOrSnapshot: number;
  coursArgentSnapshot: number;
  coefficientVenteSnapshot: number;
}

export function OrInvestPickerForm({ lotId, onClose, coursOrSnapshot, coursArgentSnapshot, coefficientVenteSnapshot }: OrInvestPickerFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [catalog, setCatalog] = useState<OrInvestissement[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [quantite, setQuantite] = useState("1");
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("or_investissement")
        .select("*")
        .order("designation", { ascending: true });

      setCatalog((data ?? []) as OrInvestissement[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  function getCoursForMetal(metal: string | null): number {
    if (!metal) return 0;
    if (metal === "Or") return coursOrSnapshot;
    if (metal === "Argent") return coursArgentSnapshot;
    return 0;
  }

  function calculerPrixVente(item: OrInvestissement): number {
    const cours = getCoursForMetal(item.metal);
    const titre = item.titre ? parseFloat(item.titre) : 0;
    const poids = item.poids ?? 0;
    return Math.round(cours * poids * (titre / 1000) * coefficientVenteSnapshot * 100) / 100;
  }

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch) return catalog;
    const q = catalogSearch.toLowerCase();
    return catalog.filter(
      (item) =>
        item.designation.toLowerCase().includes(q) ||
        (item.metal ?? "").toLowerCase().includes(q) ||
        (item.pays ?? "").toLowerCase().includes(q)
    );
  }, [catalog, catalogSearch]);

  const selectedItem = catalog.find((item) => item.id === selectedId);
  const qty = parseInt(quantite) || 1;
  const prixUnitaire = selectedItem ? calculerPrixVente(selectedItem) : 0;
  const prixTotal = prixUnitaire * qty;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedItem) {
      setError("Veuillez sélectionner un produit du catalogue.");
      return;
    }

    if (qty < 1) {
      setError("La quantité doit être au moins 1.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: dbError } = await supabase.from("vente_lignes").insert({
      lot_id: lotId,
      or_investissement_id: selectedItem.id,
      bijoux_stock_id: null,
      designation: selectedItem.designation,
      metal: selectedItem.metal,
      qualite: selectedItem.titre,
      poids: selectedItem.poids,
      quantite: qty,
      prix_unitaire: prixUnitaire,
      prix_total: prixTotal,
      taxe_applicable: false,
      montant_taxe: 0,
      fulfillment: "pending",
    });

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Card className="border-border bg-white dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Coins size={16} weight="duotone" />
          Ajouter un or investissement
        </CardTitle>
        <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Fermer">
          <X size={14} weight="regular" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-150">{error}</p>}

          <div className="space-y-2">
            <Label>Produit</Label>
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
                    ? `${selectedItem.designation} — ${selectedItem.metal ?? ""} (${selectedItem.poids ?? 0}g)`
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
                  {loading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Chargement...
                    </p>
                  ) : filteredCatalog.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun produit trouvé.
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
                            — {item.metal ?? "?"} ({item.poids ?? 0}g)
                          </span>
                          {(() => { const p = calculerPrixVente(item); return p > 0 ? (
                            <span className="text-muted-foreground ml-1.5">— {formatCurrency(p)}</span>
                          ) : null; })()}
                          <span className={`ml-1.5 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium ${item.quantite > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                            Stock : {item.quantite}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Prix unitaire</Label>
              <Input
                value={prixUnitaire ? formatCurrency(prixUnitaire) : "—"}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {selectedItem && prixTotal > 0 && (
            <div className="rounded-lg bg-secondary text-secondary-foreground p-3 space-y-1">
              <p className="text-xs text-secondary-foreground/70 flex items-center gap-1">
                <CurrencyEur size={12} weight="duotone" />
                Prix total ({qty} × {formatCurrency(prixUnitaire)})
              </p>
              <p className="text-lg font-bold">
                {formatCurrency(prixTotal)}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={saving || !selectedItem}>
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Enregistrement..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
