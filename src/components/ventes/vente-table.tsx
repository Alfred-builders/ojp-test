"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowsDownUp, ArrowUp, ArrowDown, DotsThree, Eye, Trash, Storefront } from "@phosphor-icons/react";
import type { LotWithDossier } from "@/types/lot";
import type { VenteStatus } from "@/types/vente";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { VenteStatusBadge } from "@/components/ventes/vente-status-badge";
import { VenteToolbar } from "@/components/ventes/vente-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

type SortKey = "numero" | "client" | "status" | "total_prix_revente" | "created_at";
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

export function VenteTable({ data }: { data: LotWithDossier[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<VenteStatus[]>([]);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

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
          item.numero.toLowerCase().includes(q) ||
          item.dossier.numero.toLowerCase().includes(q) ||
          item.dossier.client.last_name.toLowerCase().includes(q) ||
          item.dossier.client.first_name.toLowerCase().includes(q)
      );
    }

    if (statusFilters.length > 0) {
      result = result.filter((item) => statusFilters.includes(item.status as VenteStatus));
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "client") {
          cmp = a.dossier.client.last_name.localeCompare(b.dossier.client.last_name, "fr");
        } else if (sortKey === "total_prix_revente") {
          cmp = a.total_prix_revente - b.total_prix_revente;
        } else {
          const aVal = String(a[sortKey] ?? "");
          const bVal = String(b[sortKey] ?? "");
          cmp = aVal.localeCompare(bVal, "fr");
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, statusFilters, sortKey, sortDir]);

  const totalItems = filtered.length;
  const paginatedData = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <VenteToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }}
        statusFilters={statusFilters}
        onStatusFiltersChange={(v) => { setStatusFilters(v); setCurrentPage(0); }}
      />
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border bg-white dark:bg-card">
        <Table className={paginatedData.length === 0 ? "h-full" : ""}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="bg-transparent hover:bg-transparent">
              <SortableHead sortKey="numero" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="pl-4">
                Numéro
              </SortableHead>
              <SortableHead sortKey="client" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Client
              </SortableHead>
              <SortableHead sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Statut
              </SortableHead>
              <SortableHead sortKey="total_prix_revente" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Prix de vente
              </SortableHead>
              <SortableHead sortKey="created_at" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Date
              </SortableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-24 px-4 text-center text-muted-foreground">
                  Aucune vente trouvée.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => {
                const clientName = `${item.dossier.client.civility === "M" ? "M." : "Mme"} ${item.dossier.client.first_name} ${item.dossier.client.last_name}`;
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer bg-white dark:bg-card"
                    onClick={() => router.push(`/ventes/${item.id}`)}
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <Storefront size={16} weight="duotone" className="text-muted-foreground" />
                        </div>
                        <span className="font-medium">{item.numero}</span>
                      </div>
                    </TableCell>
                    <TableCell>{clientName}</TableCell>
                    <TableCell>
                      <VenteStatusBadge status={item.status as VenteStatus} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.total_prix_revente)}
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell className="pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            />
                          }
                        >
                          <DotsThree size={16} weight="regular" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              router.push(`/ventes/${item.id}`);
                            }}
                          >
                            <Eye size={16} weight="duotone" />
                            Voir détail
                          </DropdownMenuItem>
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
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
