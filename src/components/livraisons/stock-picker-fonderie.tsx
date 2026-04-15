"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Factory,
  Package,
  X,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { createBonLivraison } from "@/lib/fonderie/create-bon-livraison";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import type { BijouxStock } from "@/types/bijoux";
import type { Fonderie } from "@/types/fonderie";

interface StockPickerFonderieProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fonderies: Fonderie[];
}

export function StockPickerFonderie({ open, onOpenChange, fonderies }: StockPickerFonderieProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stockItems, setStockItems] = useState<BijouxStock[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fonderieId, setFonderieId] = useState("");
  const [search, setSearch] = useState("");
  const [filterMetal, setFilterMetal] = useState("all");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setSelectedIds(new Set());
      setFonderieId("");
      setSearch("");
      setFilterMetal("all");
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("bijoux_stock")
        .select("*")
        .eq("statut", "en_stock")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setStockItems((data ?? []) as BijouxStock[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const filtered = useMemo(() => {
    let items = stockItems;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) =>
        i.nom.toLowerCase().includes(q) ||
        (i.metaux ?? "").toLowerCase().includes(q) ||
        (i.qualite ?? "").toLowerCase().includes(q)
      );
    }
    if (filterMetal !== "all") {
      items = items.filter((i) => i.metaux === filterMetal);
    }
    return items;
  }, [stockItems, search, filterMetal]);

  const selectedItems = useMemo(
    () => stockItems.filter((i) => selectedIds.has(i.id)),
    [stockItems, selectedIds],
  );

  const totalPoids = selectedItems.reduce((sum, i) => sum + (i.poids_net ?? i.poids ?? 0), 0);

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  }

  async function handleCreate() {
    if (!fonderieId || selectedItems.length === 0) return;
    setSaving(true);

    const fonderie = fonderies.find((f) => f.id === fonderieId)!;
    await createBonLivraison({ fonderieId, items: selectedItems, fonderie });

    setSaving(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory size={20} weight="duotone" />
            Nouvel envoi en fonderie
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les articles du stock à envoyer et choisissez la fonderie destinataire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Fonderie selector */}
          <Select value={fonderieId} onValueChange={(v) => { if (v) setFonderieId(v); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir une fonderie..." />
            </SelectTrigger>
            <SelectContent>
              {fonderies.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass size={14} weight="regular" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
            <Select value={filterMetal} onValueChange={(v) => { if (v) setFilterMetal(v); }}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="Or">Or</SelectItem>
                <SelectItem value="Argent">Argent</SelectItem>
                <SelectItem value="Platine">Platine</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stock list */}
          <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun article en stock.</p>
            ) : (
              <div>
                {/* Select all header */}
                <div className="flex items-center gap-3 px-3 py-2 border-b bg-muted/50 sticky top-0">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {selectedIds.size > 0 ? `${selectedIds.size} sélectionné${selectedIds.size > 1 ? "s" : ""}` : "Tout sélectionner"}
                  </span>
                </div>
                {filtered.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{item.nom}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {item.metaux && <Badge variant="outline" className="text-[10px] px-1 py-0">{item.metaux}</Badge>}
                        {item.qualite && <span>{item.qualite}</span>}
                        {(item.poids_net ?? item.poids) && <span>· {item.poids_net ?? item.poids}g</span>}
                      </div>
                    </div>
                    {item.prix_achat != null && (
                      <span className="text-sm text-muted-foreground shrink-0">{formatCurrency(item.prix_achat)}</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Package size={16} weight="duotone" className="text-muted-foreground" />
                <span className="font-medium">{selectedIds.size} article{selectedIds.size > 1 ? "s" : ""}</span>
                <span className="text-muted-foreground">· {totalPoids.toFixed(2)}g</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X size={14} weight="regular" />
            Annuler
          </Button>
          <Button
            disabled={saving || !fonderieId || selectedIds.size === 0}
            onClick={handleCreate}
          >
            <Factory size={14} weight="duotone" />
            {saving ? "Création..." : "Créer le bon de livraison"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
