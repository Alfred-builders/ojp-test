"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowsDownUp, ArrowUp, ArrowDown, DotsThree, Eye, Trash, Diamond, Factory } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import type { BijouxStockWithOrigin } from "@/types/bijoux";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { StockToolbar } from "@/components/stock/stock-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency } from "@/lib/format";

const statutConfig: Record<
  BijouxStockWithOrigin["statut"],
  { label: string; className: string }
> = {
  en_stock: { label: "En stock", className: "bg-blue-500/10 text-blue-600 border-blue-600/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-400/30" },
  vendu: { label: "Vendu", className: "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20" },
  reserve: { label: "Réservé", className: "bg-amber-500/10 text-amber-600 border-amber-600/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30" },
  en_depot_vente: { label: "En dépôt", className: "bg-cyan-500/10 text-cyan-600 border-cyan-600/30 dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-400/30" },
  rendu_client: { label: "Rendu client", className: "bg-gray-500/10 text-gray-600 border-gray-600/30 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-400/30" },
  en_reparation: { label: "En réparation", className: "bg-orange-500/10 text-orange-600 border-orange-600/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-400/30" },
  fondu: { label: "Fondu", className: "bg-purple-500/10 text-purple-600 border-purple-600/30 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-400/30" },
  a_fondre: { label: "À fondre", className: "bg-violet-500/10 text-violet-600 border-violet-600/30 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-400/30" },
};

type SortKey = "nom" | "poids" | "prix_achat" | "prix_revente" | "qualite" | "metaux";
type SortDir = "asc" | "desc";

function SortableHead({
  children,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead className={className}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(sortKey)}
      >
        {children}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp size={12} weight="regular" />
          ) : (
            <ArrowDown size={12} weight="regular" />
          )
        ) : (
          <ArrowsDownUp size={12} weight="regular" className="opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

interface StockTableProps {
  data: BijouxStockWithOrigin[];
  canEdit?: boolean;
  totalItems: number;
  page: number;
  pageSize: number;
}

export function StockTable({ data, canEdit = true, totalItems, page, pageSize }: StockTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<BijouxStockWithOrigin["statut"] | null>(null);
  const [metauxFilter, setMetauxFilter] = useState<NonNullable<BijouxStockWithOrigin["metaux"]> | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let result = data;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.nom.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.origin_client_name?.toLowerCase().includes(q)
      );
    }

    if (statutFilter) {
      result = result.filter((item) => item.statut === statutFilter);
    }

    if (metauxFilter) {
      result = result.filter((item) => item.metaux === metauxFilter);
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        const cmp = typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), "fr");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, statutFilter, metauxFilter, sortKey, sortDir]);

  function navigatePage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  function navigatePageSize(newSize: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("size", String(newSize));
    params.set("page", "0");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      <StockToolbar
        search={search}
        onSearchChange={setSearch}
        statutFilter={statutFilter}
        onStatutFilterChange={setStatutFilter}
        metauxFilter={metauxFilter}
        onMetauxFilterChange={setMetauxFilter}
      />
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white dark:bg-card">
            <Table className={filtered.length === 0 ? "h-full" : ""}>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="bg-transparent hover:bg-transparent">
                  <SortableHead sortKey="nom" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="pl-4">
                    Nom
                  </SortableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Origine</TableHead>
                  <SortableHead sortKey="metaux" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                    Métal
                  </SortableHead>
                  <SortableHead sortKey="qualite" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                    Qualité
                  </SortableHead>
                  <SortableHead sortKey="poids" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                    Poids
                  </SortableHead>
                  <SortableHead sortKey="prix_achat" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                    Prix d&apos;achat
                  </SortableHead>
                  <SortableHead sortKey="prix_revente" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                    Prix de revente
                  </SortableHead>
                  <TableHead className="w-10 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="bg-white dark:bg-card hover:bg-white dark:hover:bg-card">
                    <TableCell colSpan={9} className="h-24 px-4 text-center text-muted-foreground">
                      Aucun produit trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const statut = statutConfig[item.statut];
                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer bg-white dark:bg-card"
                        onClick={() => router.push(`/stock/${item.id}`)}
                      >
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            {item.photo_url ? (
                              <Image
                                src={item.photo_url}
                                alt={item.nom}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                                <Diamond size={16} weight="duotone" className="text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{item.nom}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statut.className}>{statut.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {item.origin_client_name ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>{item.metaux ?? "—"}</TableCell>
                        <TableCell>{item.qualite ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {item.poids !== null ? `${item.poids} g` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.prix_achat)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.prix_revente)}
                        </TableCell>
                        <TableCell className="pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  aria-label="Actions"
                                />
                              }
                            >
                              <DotsThree size={16} weight="regular" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  router.push(`/stock/${item.id}`);
                                }}
                              >
                                <Eye size={16} weight="duotone" />
                                Voir détail
                              </DropdownMenuItem>
                              {item.statut === "en_stock" && (
                                <DropdownMenuItem
                                  onClick={async (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    const supabase = createClient();
                                    const { error } = await mutate(
                                      supabase.from("bijoux_stock").update({ statut: "a_fondre" }).eq("id", item.id),
                                      "Erreur lors de l'envoi en fonderie"
                                    );
                                    if (error) return;
                                    router.refresh();
                                  }}
                                >
                                  <Factory size={16} weight="duotone" />
                                  Envoyer en fonderie
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <Trash size={16} weight="duotone" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
      </div>
      <DataTablePagination
        totalItems={totalItems}
        pageSize={pageSize}
        currentPage={page}
        onPageChange={navigatePage}
        onPageSizeChange={navigatePageSize}
      />
    </div>
  );
}
