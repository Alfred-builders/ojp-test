"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowsDownUp, ArrowUp, ArrowDown, DotsThree, Eye, Trash, Coins } from "@phosphor-icons/react";
import type { OrInvestissement } from "@/types/or-investissement";
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
import { OrInvestissementToolbar } from "@/components/or-investissement/or-investissement-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

type SortKey = "designation" | "poids" | "metal" | "titre" | "pays" | "annees" | "quantite";
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

interface OrInvestissementTableProps {
  data: OrInvestissement[];
  canEdit?: boolean;
  totalItems: number;
  page: number;
  pageSize: number;
}

export function OrInvestissementTable({ data, canEdit = true, totalItems, page, pageSize }: OrInvestissementTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [metalFilter, setMetalFilter] = useState<NonNullable<OrInvestissement["metal"]> | null>(null);
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

  const filtered = useMemo(() => {
    let result = data;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        item.designation.toLowerCase().includes(q)
      );
    }

    if (metalFilter) {
      result = result.filter((item) => item.metal === metalFilter);
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        const cmp =
          typeof aVal === "number" && typeof bVal === "number"
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal), "fr");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, metalFilter, sortKey, sortDir]);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      <div className="shrink-0">
        <OrInvestissementToolbar
          search={search}
          onSearchChange={setSearch}
          metalFilter={metalFilter}
          onMetalFilterChange={setMetalFilter}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
            <Table className={filtered.length === 0 ? "h-full" : ""}>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="bg-transparent hover:bg-transparent">
                  <SortableHead sortKey="designation" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="pl-4">
                    Désignation
                  </SortableHead>
                  <SortableHead sortKey="pays" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                    Pays
                  </SortableHead>
                  <SortableHead sortKey="annees" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                    Années
                  </SortableHead>
                  <SortableHead sortKey="metal" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                    Métal
                  </SortableHead>
                  <SortableHead sortKey="titre" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                    Titre
                  </SortableHead>
                  <SortableHead sortKey="poids" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                    Poids
                  </SortableHead>
                  <SortableHead sortKey="quantite" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                    Quantité
                  </SortableHead>
                  <TableHead className="w-10 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="h-24 px-4 text-center text-muted-foreground">
                      Aucun produit trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer bg-white dark:bg-card"
                      onClick={() => router.push(`/or-investissement/${item.id}`)}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                            <Coins size={16} weight="duotone" className="text-muted-foreground" />
                          </div>
                          <span className="font-medium">{item.designation}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.pays ?? "—"}</TableCell>
                      <TableCell>{item.annees ?? "—"}</TableCell>
                      <TableCell>{item.metal ?? "—"}</TableCell>
                      <TableCell>{item.titre ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {item.poids !== null ? `${item.poids} g` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            item.quantite === 0
                              ? "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-600/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30"
                          }
                        >
                          {item.quantite}
                        </Badge>
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
                                router.push(`/or-investissement/${item.id}`);
                              }}
                            >
                              <Eye size={16} weight="duotone" />
                              Voir détail
                            </DropdownMenuItem>
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
                  ))
                )}
              </TableBody>
            </Table>
      </div>
      <div className="shrink-0">
        <DataTablePagination
          totalItems={totalItems}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={navigatePage}
          onPageSizeChange={navigatePageSize}
        />
      </div>
    </div>
  );
}
