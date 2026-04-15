"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowsDownUp, ArrowUp, ArrowDown, DotsThree, Eye, Storefront } from "@phosphor-icons/react";
import type { LotWithDossier } from "@/types/lot";
import type { LotStatus } from "@/types/lot";
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
} from "@/components/ui/dropdown-menu";
import { VenteStatusBadge } from "@/components/ventes/vente-status-badge";
import { VenteToolbar } from "@/components/ventes/vente-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDate, formatCurrency } from "@/lib/format";

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

interface VenteTableProps {
  data: LotWithDossier[];
  totalItems: number;
  page: number;
  pageSize: number;
}

export function VenteTable({ data, totalItems, page, pageSize }: VenteTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<LotStatus[]>([]);
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
          item.numero.toLowerCase().includes(q) ||
          item.dossier.numero.toLowerCase().includes(q) ||
          item.dossier.client.last_name.toLowerCase().includes(q) ||
          item.dossier.client.first_name.toLowerCase().includes(q)
      );
    }

    if (statusFilters.length > 0) {
      result = result.filter((item) => statusFilters.includes(item.status as LotStatus));
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
      <VenteToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilters={statusFilters}
        onStatusFiltersChange={setStatusFilters}
      />
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white dark:bg-card">
        <Table className={filtered.length === 0 ? "h-full" : ""}>
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
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-24 px-4 text-center text-muted-foreground">
                  Aucune vente trouvée.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
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
                      <VenteStatusBadge status={item.status as LotStatus} />
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
                              router.push(`/ventes/${item.id}`);
                            }}
                          >
                            <Eye size={16} weight="duotone" />
                            Voir détail
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
        currentPage={page}
        onPageChange={navigatePage}
        onPageSizeChange={navigatePageSize}
      />
    </div>
  );
}
