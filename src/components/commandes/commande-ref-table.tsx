"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Package,
  Coins,
  Factory,
  Plus,
  Trash,
  ArrowsLeftRight,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { createBonsCommande } from "@/lib/fonderie/create-bon-commande";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { CommandeLigneFlat } from "@/types/commande";
import type { Fonderie } from "@/types/fonderie";
import { formatCurrency } from "@/lib/format";
import { FULFILLMENT_BADGE } from "@/lib/fonderie/status-config";
import type { FulfillmentStatus } from "@/types/vente";

// ── Dispatch types ──

interface DispatchEntry {
  type: "stock" | "fonderie";
  fonderie_id?: string;
  quantite: number;
}

interface CommandeRefTableProps {
  data: CommandeLigneFlat[];
  fonderies: Fonderie[];
  onGenerateReady: (fn: (() => void) | null, canGenerate: boolean, count: number, generating: boolean) => void;
}

export function CommandeRefTable({ data: initialData, fonderies, onGenerateReady }: CommandeRefTableProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { setData(initialData); }, [initialData]);

  // Dispatch assignments: ligne.id → DispatchEntry[]
  const [dispatches, setDispatches] = useState<Record<string, DispatchEntry[]>>({});

  // Dispatch dialog state
  const [dialogLigne, setDialogLigne] = useState<CommandeLigneFlat | null>(null);
  const [dialogEntries, setDialogEntries] = useState<DispatchEntry[]>([]);

  const pendingLines = useMemo(() =>
    data.filter((l) => l.fulfillment === "pending" || l.fulfillment === "a_commander"),
    [data],
  );

  const filtered = useMemo(() => {
    if (!search) return pendingLines;
    const q = search.toLowerCase();
    return pendingLines.filter(
      (item) =>
        item.designation.toLowerCase().includes(q) ||
        item.client_name.toLowerCase().includes(q) ||
        item.lot_numero.toLowerCase().includes(q),
    );
  }, [pendingLines, search]);

  const totalItems = filtered.length;
  const paginatedData = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // Has any dispatch assigned?
  const hasDispatches = Object.values(dispatches).some((entries) => entries.length > 0);

  // Sync dispatch state to parent
  useEffect(() => {
    onGenerateReady(
      hasDispatches ? handleDispatch : null,
      hasDispatches,
      0,
      generating,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDispatches, generating, dispatches]);

  const fonderieMap = Object.fromEntries(fonderies.map((f) => [f.id, f.nom]));

  // ── Dialog helpers ──

  function openDispatchDialog(ligne: CommandeLigneFlat) {
    setDialogLigne(ligne);
    const existing = dispatches[ligne.id];
    if (existing && existing.length > 0) {
      setDialogEntries(existing.map((e) => ({ ...e })));
    } else {
      // Default: stock row if available
      const entries: DispatchEntry[] = [];
      if (ligne.stock_disponible > 0) {
        entries.push({ type: "stock", quantite: Math.min(ligne.stock_disponible, ligne.quantite) });
      }
      setDialogEntries(entries);
    }
  }

  function addFonderieRow() {
    setDialogEntries((prev) => [...prev, { type: "fonderie", fonderie_id: undefined, quantite: 0 }]);
  }

  function updateEntry(index: number, patch: Partial<DispatchEntry>) {
    setDialogEntries((prev) => prev.map((e, i) => i === index ? { ...e, ...patch } : e));
  }

  function removeEntry(index: number) {
    setDialogEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function confirmDispatchDialog() {
    if (!dialogLigne) return;
    const valid = dialogEntries.filter((e) => e.quantite > 0 && (e.type === "stock" || e.fonderie_id));
    setDispatches((prev) => ({ ...prev, [dialogLigne.id]: valid }));
    setDialogLigne(null);
  }

  function clearDispatch(ligneId: string) {
    setDispatches((prev) => {
      const next = { ...prev };
      delete next[ligneId];
      return next;
    });
  }

  // ── Dispatch validation ──

  const dialogTotal = dialogEntries.reduce((sum, e) => sum + e.quantite, 0);
  const dialogMax = dialogLigne?.quantite ?? 0;
  const dialogStockMax = Math.min(dialogLigne?.stock_disponible ?? 0, dialogMax);
  const dialogValid = dialogTotal === dialogMax && dialogEntries.every((e) => e.quantite > 0 && (e.type === "stock" || e.fonderie_id));
  const hasStockRow = dialogEntries.some((e) => e.type === "stock");

  // ── Execute dispatch ──

  async function handleDispatch() {
    if (!hasDispatches) return;
    setGenerating(true);
    const supabase = createClient();

    // Group fonderie dispatches across all lines
    const fonderieGroups = new Map<string, CommandeLigneFlat[]>();

    for (const [ligneId, entries] of Object.entries(dispatches)) {
      const ligne = data.find((l) => l.id === ligneId);
      if (!ligne) continue;

      const stockEntry = entries.find((e) => e.type === "stock");
      const fonderieEntries = entries.filter((e) => e.type === "fonderie" && e.fonderie_id);

      if (stockEntry && stockEntry.quantite > 0) {
        if (stockEntry.quantite >= ligne.quantite && fonderieEntries.length === 0) {
          // Full stock
          await mutate(
            supabase.from("vente_lignes").update({ fulfillment: "servi_stock" as FulfillmentStatus }).eq("id", ligneId),
            "Erreur", "Référence servie",
          );
          if (ligne.or_investissement_id) {
            await mutate(
              supabase.rpc("increment_or_invest_quantite", { p_id: ligne.or_investissement_id, p_qty: -stockEntry.quantite }),
              "Erreur stock", "Stock mis à jour",
            );
          }
        } else {
          // Partial stock → split: update original line for stock portion
          await mutate(
            supabase.from("vente_lignes").update({
              quantite: stockEntry.quantite,
              prix_total: ligne.prix_unitaire * stockEntry.quantite,
              fulfillment: "servi_stock" as FulfillmentStatus,
            }).eq("id", ligneId),
            "Erreur", "Référence servie",
          );
          if (ligne.or_investissement_id) {
            await mutate(
              supabase.rpc("increment_or_invest_quantite", { p_id: ligne.or_investissement_id, p_qty: -stockEntry.quantite }),
              "Erreur stock", "Stock mis à jour",
            );
          }
          // Create new lines for each fonderie portion
          for (const fe of fonderieEntries) {
            if (!fe.fonderie_id || fe.quantite <= 0) continue;
            const { data: newLigne } = await supabase.from("vente_lignes").insert({
              lot_id: ligne.lot_id,
              or_investissement_id: ligne.or_investissement_id,
              designation: ligne.designation,
              metal: ligne.metal,
              qualite: null,
              poids: ligne.poids,
              quantite: fe.quantite,
              prix_unitaire: ligne.prix_unitaire,
              prix_total: ligne.prix_unitaire * fe.quantite,
              fulfillment: "pending",
              fonderie_id: fe.fonderie_id,
            }).select().single();
            // Add to fonderie group for BDC creation
            if (newLigne) {
              const group = fonderieGroups.get(fe.fonderie_id) ?? [];
              group.push({ ...ligne, id: newLigne.id, quantite: fe.quantite, prix_total: ligne.prix_unitaire * fe.quantite });
              fonderieGroups.set(fe.fonderie_id, group);
            }
          }
        }
      } else {
        // No stock, only fonderie entries
        if (fonderieEntries.length === 1 && fonderieEntries[0].quantite === ligne.quantite) {
          // Single fonderie, full qty → add to group directly
          const fe = fonderieEntries[0];
          const group = fonderieGroups.get(fe.fonderie_id!) ?? [];
          group.push(ligne);
          fonderieGroups.set(fe.fonderie_id!, group);
        } else {
          // Multiple fonderies → split into separate lines
          let isFirst = true;
          for (const fe of fonderieEntries) {
            if (!fe.fonderie_id || fe.quantite <= 0) continue;
            if (isFirst) {
              // Reuse original line
              await supabase.from("vente_lignes").update({
                quantite: fe.quantite,
                prix_total: ligne.prix_unitaire * fe.quantite,
                fonderie_id: fe.fonderie_id,
              }).eq("id", ligneId);
              const group = fonderieGroups.get(fe.fonderie_id) ?? [];
              group.push({ ...ligne, quantite: fe.quantite, prix_total: ligne.prix_unitaire * fe.quantite });
              fonderieGroups.set(fe.fonderie_id, group);
              isFirst = false;
            } else {
              const { data: newLigne } = await supabase.from("vente_lignes").insert({
                lot_id: ligne.lot_id,
                or_investissement_id: ligne.or_investissement_id,
                designation: ligne.designation,
                metal: ligne.metal,
                qualite: null,
                poids: ligne.poids,
                quantite: fe.quantite,
                prix_unitaire: ligne.prix_unitaire,
                prix_total: ligne.prix_unitaire * fe.quantite,
                fulfillment: "pending",
                fonderie_id: fe.fonderie_id,
              }).select().single();
              if (newLigne) {
                const group = fonderieGroups.get(fe.fonderie_id) ?? [];
                group.push({ ...ligne, id: newLigne.id, quantite: fe.quantite, prix_total: ligne.prix_unitaire * fe.quantite });
                fonderieGroups.set(fe.fonderie_id, group);
              }
            }
          }
        }
      }
    }

    // Create BDCs for fonderie groups
    if (fonderieGroups.size > 0) {
      await createBonsCommande({ groups: fonderieGroups, fonderies });
    }

    setDispatches({});
    setGenerating(false);
    router.refresh();
  }

  // ── Dispatch summary for a line ──

  function getDispatchSummary(ligneId: string): string[] {
    const entries = dispatches[ligneId];
    if (!entries || entries.length === 0) return [];
    return entries.map((e) => {
      if (e.type === "stock") return `Stock ×${e.quantite}`;
      return `${e.fonderie_id ? fonderieMap[e.fonderie_id] ?? "Fonderie" : "?"} ×${e.quantite}`;
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white dark:bg-card">
        <Table className={paginatedData.length === 0 ? "h-full" : ""}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="bg-transparent hover:bg-transparent">
              <TableHead className="pl-4">Désignation</TableHead>
              <TableHead>Lot / Client</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="w-[220px] pr-4">Destination</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent h-full">
                <TableCell colSpan={6} className="text-center align-middle text-muted-foreground">
                  <Package size={32} weight="duotone" className="mx-auto mb-2 opacity-40" />
                  Aucune ligne en attente de dispatch.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((ligne) => {
                const summary = getDispatchSummary(ligne.id);
                const hasDispatch = summary.length > 0;
                const hasStock = ligne.stock_disponible > 0;

                return (
                  <TableRow key={ligne.id} className="bg-white dark:bg-card">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Coins size={16} weight="duotone" className="text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{ligne.designation}</span>
                          <p className="text-xs text-muted-foreground">
                            {ligne.metal ?? ""} {ligne.poids ? `· ${ligne.poids}g` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{ligne.lot_numero}</span>
                      <p className="text-xs text-muted-foreground">{ligne.client_name}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium">×{ligne.quantite}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(ligne.prix_total)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${hasStock ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {ligne.stock_disponible}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      {hasDispatch ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {summary.map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0.5 cursor-pointer" onClick={() => openDispatchDialog(ligne)}>
                              {s}
                            </Badge>
                          ))}
                          <Button size="icon-sm" variant="ghost" className="h-5 w-5" onClick={() => clearDispatch(ligne.id)}>
                            <Trash size={12} weight="regular" className="text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => openDispatchDialog(ligne)}>
                          <ArrowsLeftRight size={14} weight="duotone" />
                          Dispatcher
                        </Button>
                      )}
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

      {/* Dispatch dialog */}
      <Dialog open={!!dialogLigne} onOpenChange={(open) => { if (!open) setDialogLigne(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispatcher — {dialogLigne?.designation}</DialogTitle>
            <DialogDescription>
              Quantité à dispatcher : <strong>{dialogMax}</strong>
              {dialogLigne && dialogLigne.stock_disponible > 0 && (
                <> · Stock disponible : <strong>{dialogLigne.stock_disponible}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {dialogEntries.map((entry, i) => {
              const othersTotal = dialogEntries.reduce((sum, e, j) => j === i ? sum : sum + e.quantite, 0);
              const remaining = dialogMax - othersTotal;
              const maxForEntry = entry.type === "stock" ? Math.min(remaining, dialogStockMax) : remaining;

              return (
                <div key={i} className="flex items-center gap-2">
                  {entry.type === "stock" ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
                        <Package size={14} weight="duotone" className="text-foreground" />
                      </div>
                      <span className="text-sm font-medium">Stock</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
                        <Factory size={14} weight="duotone" className="text-foreground" />
                      </div>
                      <Select
                        value={entry.fonderie_id ?? ""}
                        onValueChange={(v) => { if (v) updateEntry(i, { fonderie_id: v }); }}
                      >
                        <SelectTrigger className="h-7 flex-1 text-xs">
                          <span className="truncate">
                            {entry.fonderie_id ? fonderieMap[entry.fonderie_id] ?? "Fonderie" : "Fonderie..."}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {fonderies.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Input
                    type="number"
                    min={0}
                    max={maxForEntry}
                    value={entry.quantite || ""}
                    onChange={(e) => updateEntry(i, { quantite: Math.min(Math.max(0, Number(e.target.value)), maxForEntry) })}
                    className="w-20 h-7 text-center"
                  />
                  <Button size="icon-sm" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeEntry(i)}>
                    <Trash size={14} weight="regular" className="text-muted-foreground" />
                  </Button>
                </div>
              );
            })}

            {/* Add buttons */}
            <div className="flex items-center gap-2 pt-1">
              {!hasStockRow && dialogLigne && dialogLigne.stock_disponible > 0 && (
                <Button size="sm" variant="outline" onClick={() => setDialogEntries((prev) => [{ type: "stock", quantite: 0 }, ...prev])}>
                  <Package size={14} weight="duotone" />
                  Stock
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={addFonderieRow}>
                <Plus size={14} weight="bold" />
                Fonderie
              </Button>
            </div>

            {/* Total indicator */}
            <div className={`flex items-center justify-between text-sm pt-2 border-t ${dialogTotal === dialogMax ? "text-emerald-600" : dialogTotal > dialogMax ? "text-red-500" : "text-muted-foreground"}`}>
              <span>Total dispatché</span>
              <span className="font-bold">{dialogTotal} / {dialogMax}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogLigne(null)}>
              Annuler
            </Button>
            <Button size="sm" disabled={!dialogValid} onClick={confirmDispatchDialog}>
              <ArrowsLeftRight size={14} weight="duotone" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
