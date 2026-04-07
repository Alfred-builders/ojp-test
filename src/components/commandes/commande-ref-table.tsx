"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Package,
  Coins,
  Factory,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { DOSSIER_WITH_CLIENT } from "@/lib/supabase/queries";
import { generateDocument } from "@/lib/pdf/pdf-actions";
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
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import type { FulfillmentStatus } from "@/types/vente";

const FULFILLMENT_BADGE: Record<string, { label: string; className: string }> = {
  commande: { label: "Commandé", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  servi_stock: { label: "Servi stock", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  recu: { label: "Reçu", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

interface CommandeRefTableProps {
  data: CommandeLigneFlat[];
  fonderies: Fonderie[];
  onGenerateReady: (fn: (() => void) | null, canGenerate: boolean, count: number, generating: boolean) => void;
}

export function CommandeRefTable({ data: initialData, fonderies, onGenerateReady }: CommandeRefTableProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Sync with parent prop when it changes
  useEffect(() => { setData(initialData); }, [initialData]);

  // Fonderie assignments: ligne.id → fonderie_id
  const [fonderieAssignments, setFonderieAssignments] = useState<Record<string, string>>({});

  // Split dialog state
  const [splitLigne, setSplitLigne] = useState<CommandeLigneFlat | null>(null);
  const [splitQty, setSplitQty] = useState(0);

  const pendingLines = useMemo(() =>
    data.filter((l) => l.fulfillment === "pending" || l.fulfillment === "a_commander"),
    [data]
  );
  const processedLines = useMemo(() =>
    data.filter((l) => l.fulfillment !== "pending" && l.fulfillment !== "a_commander"),
    [data]
  );

  const filtered = useMemo(() => {
    if (!search) return pendingLines;
    const q = search.toLowerCase();
    return pendingLines.filter(
      (item) =>
        item.designation.toLowerCase().includes(q) ||
        item.client_name.toLowerCase().includes(q) ||
        item.lot_numero.toLowerCase().includes(q)
    );
  }, [pendingLines, search]);

  const totalItems = filtered.length;
  const paginatedData = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // Count unique fonderies assigned
  const uniqueFonderies = new Set(Object.values(fonderieAssignments).filter(Boolean));
  const hasFonderieAssignments = uniqueFonderies.size > 0;

  // Sync generate state to parent
  useEffect(() => {
    onGenerateReady(
      hasFonderieAssignments ? handleGenerateBDC : null,
      hasFonderieAssignments,
      uniqueFonderies.size,
      generating
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFonderieAssignments, uniqueFonderies.size, generating, fonderieAssignments]);

  // --- Stock handling ---
  async function handleServeStock(ligne: CommandeLigneFlat) {
    if (ligne.stock_disponible <= 0) return;

    if (ligne.stock_disponible < ligne.quantite) {
      // Partial stock → open split dialog
      setSplitLigne(ligne);
      setSplitQty(ligne.stock_disponible);
      return;
    }

    // Full stock
    setLoading(ligne.id);
    try {
      const supabase = createClient();
      const { error } = await mutate(
        supabase.from("vente_lignes").update({ fulfillment: "servi_stock" as FulfillmentStatus }).eq("id", ligne.id),
        "Erreur lors de la mise à jour du fulfillment",
        "Référence servie"
      );
      if (error) return;
      if (ligne.or_investissement_id) {
        const { error: rpcErr } = await mutate(
          supabase.rpc("increment_or_invest_quantite", { p_id: ligne.or_investissement_id, p_qty: -ligne.quantite }),
          "Erreur lors de la mise à jour du stock",
          "Référence servie"
        );
        if (rpcErr) return;
      }
      setData((prev) => prev.map((l) => l.id === ligne.id ? { ...l, fulfillment: "servi_stock" } : l));
      router.refresh();
    } catch (err) {
      console.error("Erreur lors du service depuis le stock:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleSplitConfirm() {
    if (!splitLigne || splitQty <= 0) return;
    setLoading(splitLigne.id);
    try {
      const supabase = createClient();
      const remaining = splitLigne.quantite - splitQty;

      // Update original line: reduce qty and serve from stock
      const newPrixTotal = splitLigne.prix_unitaire * splitQty;
      const { error: updateErr } = await mutate(
        supabase.from("vente_lignes").update({
          quantite: splitQty,
          prix_total: newPrixTotal,
          fulfillment: "servi_stock" as FulfillmentStatus,
        }).eq("id", splitLigne.id),
        "Erreur lors de la mise à jour de la ligne",
        "Référence servie"
      );
      if (updateErr) return;

      // Decrement stock
      if (splitLigne.or_investissement_id) {
        const { error: rpcErr } = await mutate(
          supabase.rpc("increment_or_invest_quantite", { p_id: splitLigne.or_investissement_id, p_qty: -splitQty }),
          "Erreur lors de la mise à jour du stock",
          "Référence servie"
        );
        if (rpcErr) return;
      }

      // Create new line for the remainder
      const remainingTotal = splitLigne.prix_unitaire * remaining;
      const { error: insertErr } = await mutate(
        supabase.from("vente_lignes").insert({
          lot_id: splitLigne.lot_id,
          or_investissement_id: splitLigne.or_investissement_id,
          designation: splitLigne.designation,
          metal: splitLigne.metal,
          qualite: null,
          poids: splitLigne.poids,
          quantite: remaining,
          prix_unitaire: splitLigne.prix_unitaire,
          prix_total: remainingTotal,
          fulfillment: "pending",
        }),
        "Erreur lors de la création de la ligne restante",
        "Référence servie"
      );
      if (insertErr) return;

      setSplitLigne(null);
      router.refresh();
    } catch (err) {
      console.error("Erreur lors du split de ligne:", err);
    } finally {
      setLoading(null);
    }
  }

  // --- Fonderie assignment ---
  function handleAssignFonderie(ligneId: string, fonderieId: string) {
    setFonderieAssignments((prev) => ({ ...prev, [ligneId]: fonderieId }));
  }

  // --- Generate BDC ---
  async function handleGenerateBDC() {
    if (!hasFonderieAssignments) return;
    setGenerating(true);
    const supabase = createClient();

    const groups = new Map<string, CommandeLigneFlat[]>();
    for (const [ligneId, fonderieId] of Object.entries(fonderieAssignments)) {
      const ligne = data.find((l) => l.id === ligneId);
      if (!ligne) continue;
      const existing = groups.get(fonderieId) ?? [];
      existing.push(ligne);
      groups.set(fonderieId, existing);
    }

    for (const [fonderieId, lignes] of groups) {
      const fonderie = fonderies.find((f) => f.id === fonderieId);
      if (!fonderie) continue;

      const { data: bdc, error: bdcErr } = await mutate(
        supabase
          .from("bons_commande")
          .insert({ fonderie_id: fonderieId, numero: "" })
          .select()
          .single(),
        "Erreur lors de la création du bon de commande",
        "Référence servie"
      );

      if (bdcErr || !bdc) break;

      const ligneIds = lignes.map((l) => l.id);
      const { error: updateErr } = await mutate(
        supabase.from("vente_lignes").update({
          bon_commande_id: bdc.id,
          fonderie_id: fonderieId,
          fulfillment: "commande" as FulfillmentStatus,
        }).in("id", ligneIds),
        "Erreur lors de la mise à jour des lignes de commande",
        "Référence servie"
      );
      if (updateErr) break;

      // Generate PDF
      const firstLigne = lignes[0];
      const { data: lotData } = await supabase
        .from("lots")
        .select(`id, numero, ${DOSSIER_WITH_CLIENT}`)
        .eq("id", firstLigne.lot_id)
        .single();

      if (lotData) {
        const dossier = Array.isArray(lotData.dossier) ? lotData.dossier[0] : lotData.dossier;
        const client = dossier?.client ? (Array.isArray(dossier.client) ? dossier.client[0] : dossier.client) : null;
        const now = new Date();
        const dateStr = formatDate(now.toISOString());

        await generateDocument({
          type: "bon_commande",
          lotId: lotData.id,
          dossierId: dossier?.id ?? "",
          clientId: client?.id ?? "",
          client: {
            civilite: client?.civility === "M" ? "M." : "Mme",
            nom: client?.last_name ?? "",
            prenom: client?.first_name ?? "",
          },
          dossier: {
            numeroDossier: dossier?.numero ?? "",
            numeroLot: lotData.numero,
            date: dateStr,
            heure: formatTime(now),
          },
          references: [],
          totaux: { totalBrut: 0, taxe: 0, netAPayer: 0 },
          fonderie: {
            nom: fonderie.nom,
            adresse: fonderie.adresse ?? undefined,
            codePostal: fonderie.code_postal ?? undefined,
            ville: fonderie.ville ?? undefined,
            telephone: fonderie.telephone ?? undefined,
            email: fonderie.email ?? undefined,
          },
          bonCommandeLignes: lignes.map((l) => ({
            designation: l.designation,
            metal: l.metal ?? "Or",
            poids: l.poids ?? 0,
            quantite: l.quantite,
            prixUnitaire: l.prix_unitaire,
            total: l.prix_total,
          })),
          bonCommandeTotalHT: lignes.reduce((sum, l) => sum + l.prix_total, 0),
        });
      }
    }

    // Update local state: mark processed lines as "commande"
    const processedIds = new Set(Object.keys(fonderieAssignments));
    setData((prev) => prev.map((l) => processedIds.has(l.id) ? { ...l, fulfillment: "commande" } : l));

    setFonderieAssignments({});
    setGenerating(false);
    router.refresh();
  }

  const fonderieMap = Object.fromEntries(fonderies.map((f) => [f.id, f.nom]));

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
      <div className="min-h-0 max-h-[60vh] overflow-auto rounded-lg border bg-white dark:bg-card">
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
            {paginatedData.length === 0 && processedLines.length === 0 ? (
              <TableRow className="hover:bg-transparent h-full">
                <TableCell colSpan={6} className="text-center align-middle text-muted-foreground">
                  <Package size={32} weight="duotone" className="mx-auto mb-2 opacity-40" />
                  Aucune ligne en attente de commande.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {paginatedData.map((ligne) => {
                  const isLoading = loading === ligne.id;
                  const hasStock = ligne.stock_disponible > 0;
                  const assigned = fonderieAssignments[ligne.id];

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
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!hasStock || isLoading}
                            onClick={() => handleServeStock(ligne)}
                            className="shrink-0"
                          >
                            <Package size={14} weight="duotone" />
                            Ajouter du stock
                          </Button>
                          <Select
                            value={assigned ?? ""}
                            onValueChange={(v) => { if (v) handleAssignFonderie(ligne.id, String(v)); }}
                          >
                            <SelectTrigger className="h-7 w-full text-[0.8rem] font-medium !border-border !bg-background hover:!bg-muted !text-foreground dark:!border-input dark:!bg-input/30 dark:hover:!bg-input/50">
                              <Factory size={14} weight="duotone" />
                              {assigned ? fonderieMap[assigned] ?? "Fonderie" : "Commander en fonderie"}
                            </SelectTrigger>
                            <SelectContent className="min-w-[200px]">
                              {fonderies.map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Processed lines (greyed out) */}
                {processedLines.map((ligne) => {
                  const badge = FULFILLMENT_BADGE[ligne.fulfillment];
                  return (
                    <TableRow key={ligne.id} className="bg-white opacity-50 dark:bg-card">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Coins size={14} weight="duotone" className="text-muted-foreground" />
                          </div>
                          <span className="text-sm">{ligne.designation}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{ligne.lot_numero}</span>
                        <p className="text-xs text-muted-foreground">{ligne.client_name}</p>
                      </TableCell>
                      <TableCell className="text-right">×{ligne.quantite}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(ligne.prix_total)}</TableCell>
                      <TableCell className="text-right">{ligne.stock_disponible}</TableCell>
                      <TableCell className="pr-4">
                        {badge && (
                          <Badge variant="secondary" className={badge.className}>
                            {badge.label}
                            {ligne.fulfillment === "commande" && ligne.fonderie_id && fonderieMap[ligne.fonderie_id]
                              ? ` — ${fonderieMap[ligne.fonderie_id]}`
                              : ""}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {totalItems > pageSize && (
        <DataTablePagination
          totalItems={totalItems}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Split dialog */}
      <Dialog open={!!splitLigne} onOpenChange={(open) => { if (!open) setSplitLigne(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Servir partiellement depuis le stock</DialogTitle>
            <DialogDescription>
              Stock disponible : <strong>{splitLigne?.stock_disponible}</strong> — Quantité demandée : <strong>{splitLigne?.quantite}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Combien de pièces servir depuis le stock ? Le reste sera à commander en fonderie.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Servir :</span>
              <Input
                type="number"
                min={1}
                max={splitLigne?.stock_disponible ?? 0}
                value={splitQty}
                onChange={(e) => setSplitQty(Math.min(Number(e.target.value), splitLigne?.stock_disponible ?? 0))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">sur {splitLigne?.quantite}</span>
            </div>
            {splitLigne && splitQty > 0 && splitQty < splitLigne.quantite && (
              <p className="text-xs text-muted-foreground">
                → {splitQty} servi{splitQty > 1 ? "s" : ""} depuis le stock, {splitLigne.quantite - splitQty} à commander
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSplitLigne(null)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={!splitQty || splitQty <= 0 || loading !== null}
              onClick={handleSplitConfirm}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
