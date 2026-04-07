"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Factory,
  Diamond,
  FileText,
  ArrowRight,
  WarningCircle,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { generateBonLivraison } from "@/lib/pdf/pdf-actions";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency, formatDate } from "@/lib/format";
import type { BonLivraison } from "@/types/bon-livraison";
import type { Fonderie } from "@/types/fonderie";
import type { BijouxStock } from "@/types/bijoux";
import type { BonLivraisonGroupData } from "@/lib/pdf/blocks";

interface BonsLivraisonListProps {
  bonsLivraison: BonLivraison[];
  fonderies: Fonderie[];
}

export function BonsLivraisonList({ bonsLivraison, fonderies }: BonsLivraisonListProps) {
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

  function handleAssignFonderie(stockId: string, fonderieId: string) {
    setFonderieAssignments((prev) => ({ ...prev, [stockId]: fonderieId }));
  }

  async function handleGenerateBDL() {
    if (!canGenerate) return;
    setGenerating(true);
    const supabase = createClient();

    // Get current cours
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

    // Group assignments by fonderie
    const groups = new Map<string, BijouxStock[]>();
    for (const [stockId, fonderieId] of assignedEntries) {
      const item = stockItems.find((i) => i.id === stockId);
      if (!item) continue;
      const existing = groups.get(fonderieId) ?? [];
      existing.push(item);
      groups.set(fonderieId, existing);
    }

    for (const [fonderieId, items] of groups) {
      const fonderie = fonderies.find((f) => f.id === fonderieId);
      if (!fonderie) continue;

      const { data: bdl, error: bdlError } = await mutate(
        supabase
          .from("bons_livraison")
          .insert({ fonderie_id: fonderieId, numero: "" })
          .select()
          .single(),
        "Erreur lors de la création du bon de livraison",
        "Bon de livraison généré"
      );

      if (bdlError || !bdl) break;

      const lignesPayload = items.map((item) => {
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
          cours_utilise: Math.round(coursGramme * 100) / 100,
          valeur_estimee: Math.round(valeur * 100) / 100,
        };
      });

      const { error: lignesError } = await mutate(
        supabase.from("bon_livraison_lignes").insert(lignesPayload),
        "Erreur lors de la création des lignes du bon de livraison",
        "Lignes créées"
      );
      if (lignesError) break;

      // Mark stock items as fondu
      const { error: stockError } = await mutate(
        supabase
          .from("bijoux_stock")
          .update({ statut: "fondu" })
          .in("id", items.map((i) => i.id)),
        "Erreur lors de la mise à jour du statut des articles",
        "Statut des articles mis à jour"
      );
      if (stockError) break;

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
        groupes: Array.from(groupMap.values()),
        poidsTotal: lignesPayload.reduce((s, l) => s + (l.poids_declare ?? 0), 0),
        valeurEstimee: lignesPayload.reduce((s, l) => s + (l.valeur_estimee ?? 0), 0),
      });
    }

    setFonderieAssignments({});
    setGenerating(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-6">
      {/* Section 1: Articles marked "à fondre" */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
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

        <div className="flex-1 min-h-0 overflow-x-auto rounded-lg border bg-white dark:bg-card">
          <Table className={paginatedData.length === 0 ? "min-w-[700px] h-full" : "min-w-[700px]"}>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow className="bg-transparent hover:bg-transparent">
                <TableHead className="pl-4">Désignation</TableHead>
                <TableHead>Métal / Titrage</TableHead>
                <TableHead className="text-right">Poids</TableHead>
                <TableHead className="text-right">Prix achat</TableHead>
                <TableHead className="w-[200px] pr-4">Fonderie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStock ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow className="hover:bg-transparent h-full">
                  <TableCell colSpan={5} className="text-center align-middle text-muted-foreground">
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
                        {item.poids ? `${item.poids}g` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {item.prix_achat != null ? formatCurrency(item.prix_achat) : "—"}
                      </TableCell>
                      <TableCell className="pr-4">
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
                    </TableRow>
                  );
                })
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
      </div>

      {/* Section 2: Compact list of bons de livraison */}
      {bonsLivraison.length > 0 && (
        <BonsLivraisonCompactList bonsLivraison={bonsLivraison} />
      )}
    </div>
  );
}

// --- Compact list subcomponent ---

const STATUT_BADGE: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  envoye: { label: "Envoyé", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "Reçu", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  traite: { label: "Traité", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  annule: { label: "Annulé", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const MAX_VISIBLE = 5;

function BonsLivraisonCompactList({ bonsLivraison }: { bonsLivraison: BonLivraison[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? bonsLivraison : bonsLivraison.slice(0, MAX_VISIBLE);
  const hasMore = bonsLivraison.length > MAX_VISIBLE;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText size={16} weight="duotone" />
          Bons de livraison ({bonsLivraison.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {visible.map((bdl) => {
            const badge = STATUT_BADGE[bdl.statut] ?? STATUT_BADGE.brouillon;
            const fonderie = bdl.fonderie?.nom ?? "Fonderie";
            const nbLignes = bdl.lignes?.length ?? 0;
            const nbEcarts = (bdl.lignes ?? []).filter((l) => l.ecart_titrage || l.ecart_poids).length;

            return (
              <Link
                key={bdl.id}
                href={`/commandes/bdl/${bdl.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{bdl.numero}</span>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
                      {badge.label}
                    </Badge>
                    {nbEcarts > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <WarningCircle size={10} weight="duotone" className="mr-0.5" />
                        {nbEcarts}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fonderie} · {nbLignes} article{nbLignes > 1 ? "s" : ""} · {bdl.poids_total.toFixed(1)}g
                    {bdl.date_envoi ? ` · ${formatDate(bdl.date_envoi)}` : ""}
                  </p>
                </div>
                <span className="text-sm font-bold shrink-0">{formatCurrency(bdl.valeur_estimee)}</span>
                <ArrowRight size={14} weight="regular" className="text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
        {hasMore && !showAll && (
          <div className="px-4 py-2 border-t">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(true)}>
              Voir les {bonsLivraison.length - MAX_VISIBLE} autres
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
