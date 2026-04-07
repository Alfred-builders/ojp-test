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
import { mutate } from "@/lib/supabase/mutation";
import { generateBonLivraison } from "@/lib/pdf/pdf-actions";
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
import { formatCurrency, formatDate } from "@/lib/format";
import type { BijouxStock } from "@/types/bijoux";
import type { Fonderie } from "@/types/fonderie";
import type { BonLivraisonGroupData } from "@/lib/pdf/blocks";

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

  const totalPoids = selectedItems.reduce((sum, i) => sum + (i.poids ?? 0), 0);

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

    const supabase = createClient();
    const fonderie = fonderies.find((f) => f.id === fonderieId)!;

    // Get current cours from parametres table
    const { data: parametres } = await supabase
      .from("parametres")
      .select("prix_or, prix_argent, prix_platine")
      .eq("id", 1)
      .single();

    const coursMap: Record<string, number> = {
      Or: parametres?.prix_or ?? 0,
      Argent: parametres?.prix_argent ?? 0,
      Platine: parametres?.prix_platine ?? 0,
    };

    // Create bon de livraison
    const { data: bdl, error: bdlError } = await mutate(
      supabase
        .from("bons_livraison")
        .insert({ fonderie_id: fonderieId, numero: "" })
        .select()
        .single(),
      "Erreur lors de la création du bon de livraison",
      "Stock sélectionné"
    );

    if (bdlError || !bdl) {
      setSaving(false);
      return;
    }

    // Create lignes with snapshot data
    const lignesPayload = selectedItems.map((item) => {
      const coursMetal = coursMap[item.metaux ?? ""] ?? 0;
      const titrage = parseInt(item.qualite ?? "0") || 0;
      const coursGramme = coursMetal * (titrage / 1000);
      const valeur = (item.poids ?? 0) * coursGramme;

      return {
        bon_livraison_id: bdl.id,
        bijoux_stock_id: item.id,
        designation: item.nom,
        metal: item.metaux,
        titrage_declare: item.qualite,
        poids_declare: item.poids,
        cours_utilise: coursGramme,
        valeur_estimee: Math.round(valeur * 100) / 100,
      };
    });

    const { error: lignesError } = await mutate(
      supabase.from("bon_livraison_lignes").insert(lignesPayload),
      "Erreur lors de la création des lignes du bon de livraison",
      "Stock sélectionné"
    );
    if (lignesError) { setSaving(false); return; }

    // Mark stock items as fondu
    const { error: stockError } = await mutate(
      supabase
        .from("bijoux_stock")
        .update({ statut: "fondu" })
        .in("id", Array.from(selectedIds)),
      "Erreur lors de la mise à jour du statut des articles",
      "Stock sélectionné"
    );
    if (stockError) { setSaving(false); return; }

    // Generate PDF
    const groupMap = new Map<string, BonLivraisonGroupData>();
    for (const lp of lignesPayload) {
      const key = `${lp.metal ?? "Autre"}-${lp.titrage_declare ?? "?"}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          metal: lp.metal ?? "Autre",
          titrage: lp.titrage_declare ?? "?",
          lignes: [],
          sousTotal: { pieces: 0, poids: 0, valeur: 0 },
        });
      }
      const group = groupMap.get(key)!;
      group.lignes.push({
        designation: lp.designation,
        metal: lp.metal ?? "",
        titrage: lp.titrage_declare ?? "",
        poids: lp.poids_declare ?? 0,
        cours: lp.cours_utilise ?? 0,
        valeur: lp.valeur_estimee ?? 0,
      });
      group.sousTotal.pieces += 1;
      group.sousTotal.poids += lp.poids_declare ?? 0;
      group.sousTotal.valeur += lp.valeur_estimee ?? 0;
    }

    const groupes = Array.from(groupMap.values());
    const poidsTotal = lignesPayload.reduce((s, l) => s + (l.poids_declare ?? 0), 0);
    const valeurEstimee = lignesPayload.reduce((s, l) => s + (l.valeur_estimee ?? 0), 0);

    await generateBonLivraison(bdl.id, {
      date: formatDate(new Date().toISOString()),
      fonderie: {
        nom: fonderie.nom,
        adresse: fonderie.adresse ?? undefined,
        codePostal: fonderie.code_postal ?? undefined,
        ville: fonderie.ville ?? undefined,
        telephone: fonderie.telephone ?? undefined,
        email: fonderie.email ?? undefined,
      },
      groupes,
      poidsTotal,
      valeurEstimee,
    });

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
                        {item.poids && <span>· {item.poids}g</span>}
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
