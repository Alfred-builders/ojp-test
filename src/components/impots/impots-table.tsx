"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsDownUp, ArrowUp, ArrowDown, Receipt } from "@phosphor-icons/react";
import type { TaxeRow, TaxeType } from "@/types/impots";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { TaxeTypeBadge } from "@/components/impots/taxe-type-badge";
import { ImpotsToolbar } from "@/components/impots/impots-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDate, formatCurrency } from "@/lib/format";

type SortKey = "date" | "reference" | "client_name" | "type" | "montant_brut" | "montant_taxe";
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

interface ImpotsTableProps {
  data: TaxeRow[];
}

export function ImpotsTable({ data }: ImpotsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilters, setTypeFilters] = useState<TaxeType[]>([]);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = (() => {
    let result = data;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.reference.toLowerCase().includes(q) ||
          item.client_name.toLowerCase().includes(q)
      );
    }

    if (typeFilters.length > 0) {
      result = result.filter((item) => typeFilters.includes(item.type));
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "montant_brut" || sortKey === "montant_taxe") {
          cmp = a[sortKey] - b[sortKey];
        } else {
          const aVal = String(a[sortKey] ?? "");
          const bVal = String(b[sortKey] ?? "");
          cmp = aVal.localeCompare(bVal, "fr");
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  })();

  const totalItems = filtered.length;
  const from = page * pageSize;
  const to = from + pageSize;
  const paginated = filtered.slice(from, to);

  function navigatePage(newPage: number) {
    setPage(newPage);
  }

  function navigatePageSize(newSize: number) {
    setPageSize(newSize);
    setPage(0);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      <ImpotsToolbar
        search={search}
        onSearchChange={setSearch}
        typeFilters={typeFilters}
        onTypeFiltersChange={setTypeFilters}
      />
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white dark:bg-card">
        <Table className={paginated.length === 0 ? "h-full" : ""}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="bg-transparent hover:bg-transparent">
              <SortableHead sortKey="date" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="pl-4">
                Date
              </SortableHead>
              <SortableHead sortKey="reference" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Référence
              </SortableHead>
              <SortableHead sortKey="client_name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Client
              </SortableHead>
              <SortableHead sortKey="type" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Type
              </SortableHead>
              <SortableHead sortKey="montant_brut" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Montant brut
              </SortableHead>
              <SortableHead sortKey="montant_taxe" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Taxe
              </SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-24 px-4 text-center text-muted-foreground">
                  Aucune taxe trouvée.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer bg-white dark:bg-card"
                  onClick={() => {
                    if (item.source_type === "rachat") {
                      router.push(`/lots/${item.source_id}`);
                    } else {
                      router.push(`/ventes/${item.source_id}`);
                    }
                  }}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Receipt size={16} weight="duotone" className="text-muted-foreground" />
                      </div>
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.reference}</TableCell>
                  <TableCell>{item.client_name}</TableCell>
                  <TableCell>
                    <TaxeTypeBadge type={item.type} />
                  </TableCell>
                  <TableCell>{formatCurrency(item.montant_brut)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(item.montant_taxe)}</TableCell>
                </TableRow>
              ))
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
