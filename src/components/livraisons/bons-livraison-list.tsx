"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Factory,
  Diamond,
  Package,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { createBonsLivraison } from "@/lib/fonderie/create-bon-livraison";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency } from "@/lib/format";
import type { Fonderie } from "@/types/fonderie";
import type { BijouxStock } from "@/types/bijoux";

interface BonsLivraisonListProps {
  fonderies: Fonderie[];
}

export function BonsLivraisonList({ fonderies }: BonsLivraisonListProps) {
  const router = useRouter();
  const [stockItems, setStockItems] = useState<BijouxStock[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Per-item fonderie assignment: stockId → fonderieId
  const [fonderieAssignments, setFonderieAssignments] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  // Build fonderie name map for Select display
  const fonderieNameMap = useMemo(
    () => Object.fromEntries(fonderies.map((f) => [f.id, f.nom])),
    [fonderies],
  );

  // Fetch only articles marked "a_fondre"
  useEffect(() => {
    async function fetchStock() {
      setLoadingStock(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("bijoux_stock")
        .select("*")
        .eq("statut", "a_fondre")
        .order("created_at", { ascending: false });
      setStockItems((data ?? []) as BijouxStock[]);
      setLoadingStock(false);
    }
    fetchStock();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return stockItems;
    const q = search.toLowerCase();
    return stockItems.filter(
      (i) =>
        i.nom.toLowerCase().includes(q) ||
        (i.metaux ?? "").toLowerCase().includes(q) ||
        (i.qualite ?? "").toLowerCase().includes(q),
    );
  }, [stockItems, search]);

  const totalItems = filtered.length;
  const paginatedData = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // Count unique fonderies assigned
  const assignedEntries = Object.entries(fonderieAssignments).filter(([, v]) => v);
  const uniqueFonderies = new Set(assignedEntries.map(([, v]) => v));
  const canGenerate = assignedEntries.length > 0;

  // Track items being moved to stock
  const [movingToStock, setMovingToStock] = useState<Record<string, boolean>>({});

  async function handleGarderEnStock(itemId: string) {
    setMovingToStock((prev) => ({ ...prev, [itemId]: true }));
    const supabase = createClient();
    const { error } = await mutate(
      supabase.from("bijoux_stock").update({ statut: "en_stock" }).eq("id", itemId),
      "Erreur lors du passage en stock",
      "Article gardé en stock"
    );
    setMovingToStock((prev) => ({ ...prev, [itemId]: false }));
    if (error) return;
    setStockItems((prev) => prev.filter((i) => i.id !== itemId));
    setFonderieAssignments((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  function handleAssignFonderie(stockId: string, fonderieId: string) {
    setFonderieAssignments((prev) => ({ ...prev, [stockId]: fonderieId }));
  }

  async function handleGenerateBDL() {
    if (!canGenerate) return;
    setGenerating(true);

    const groups = new Map<string, BijouxStock[]>();
    for (const [stockId, fonderieId] of assignedEntries) {
      const item = stockItems.find((i) => i.id === stockId);
      if (!item) continue;
      const existing = groups.get(fonderieId) ?? [];
      existing.push(item);
      groups.set(fonderieId, existing);
    }

    await createBonsLivraison({ groups, fonderies });

    // Remove dispatched items from local list
    const dispatchedIds = new Set(assignedEntries.map(([id]) => id));
    setStockItems((prev) => prev.filter((i) => !dispatchedIds.has(i.id)));
    setFonderieAssignments({});
    setGenerating(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
            className="pl-9"
          />
        </div>
        {canGenerate && (
          <Button
            disabled={generating}
            onClick={handleGenerateBDL}
          >
            <Factory size={14} weight="duotone" />
            {generating
              ? "Génération..."
              : `Générer ${uniqueFonderies.size} bon${uniqueFonderies.size > 1 ? "s" : ""} de livraison`}
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white dark:bg-card">
        <Table className={paginatedData.length === 0 ? "h-full" : ""}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="bg-transparent hover:bg-transparent">
              <TableHead className="pl-4">Désignation</TableHead>
              <TableHead>Métal / Titrage</TableHead>
              <TableHead className="text-right">Poids</TableHead>
              <TableHead className="text-right">Prix achat</TableHead>
              <TableHead className="w-[200px]">Fonderie</TableHead>
              <TableHead className="w-[100px] pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingStock ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent h-full">
                <TableCell colSpan={6} className="text-center align-middle text-muted-foreground">
                  <Diamond size={32} weight="duotone" className="mx-auto mb-2 opacity-40" />
                  Aucun article à envoyer en fonderie.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => {
                const assigned = fonderieAssignments[item.id];
                const assignedName = assigned ? fonderieNameMap[assigned] : null;

                return (
                  <TableRow key={item.id} className="bg-white dark:bg-card">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Diamond size={16} weight="duotone" className="text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium">{item.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {item.metaux && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{item.metaux}</Badge>
                        )}
                        {item.qualite && (
                          <span className="text-sm text-muted-foreground">{item.qualite}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {item.poids_net ? `${item.poids_net}g` : item.poids ? `${item.poids}g` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {item.prix_achat != null ? formatCurrency(item.prix_achat) : "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={assigned ?? ""}
                        onValueChange={(v) => { if (v) handleAssignFonderie(item.id, v); }}
                      >
                        <SelectTrigger className="h-7 w-[180px] text-xs">
                          <Factory size={12} weight="duotone" />
                          <span className="flex-1 text-left truncate">
                            {assignedName ?? "Fonderie"}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="min-w-[200px]">
                          {fonderies.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="pr-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                        disabled={!!movingToStock[item.id]}
                        onClick={() => handleGarderEnStock(item.id)}
                      >
                        <Package size={14} weight="duotone" />
                        {movingToStock[item.id] ? "..." : "Stock"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="shrink-0">
        <DataTablePagination
          totalItems={totalItems}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
