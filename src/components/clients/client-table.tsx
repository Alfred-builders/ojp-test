"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowsDownUp, ArrowUp, ArrowDown, DotsThree, Eye, User } from "@phosphor-icons/react";
import type { Client } from "@/types/client";
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
} from "@/components/ui/dropdown-menu";
import { ClientToolbar } from "@/components/clients/client-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDate } from "@/lib/format";

type SortKey = "last_name" | "city" | "created_at";
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

interface ClientTableProps {
  data: Client[];
  totalItems: number;
  page: number;
  pageSize: number;
}

export function ClientTable({ data, totalItems, page, pageSize }: ClientTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
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
          item.first_name.toLowerCase().includes(q) ||
          item.last_name.toLowerCase().includes(q) ||
          item.maiden_name?.toLowerCase().includes(q) ||
          item.email?.toLowerCase().includes(q) ||
          item.phone?.toLowerCase().includes(q) ||
          item.city?.toLowerCase().includes(q)
      );
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        const cmp = String(aVal).localeCompare(String(bVal), "fr");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, sortKey, sortDir]);

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
      <ClientToolbar
        search={search}
        onSearchChange={setSearch}
      />
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white dark:bg-card">
            <Table className={filtered.length === 0 ? "h-full" : ""}>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="bg-transparent hover:bg-transparent">
                  <SortableHead sortKey="last_name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="pl-4">
                    Client
                  </SortableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <SortableHead sortKey="city" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                    Ville
                  </SortableHead>
                  <TableHead>Source</TableHead>
                  <SortableHead sortKey="created_at" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                    Date
                  </SortableHead>
                  <TableHead className="w-10 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="h-24 px-4 text-center text-muted-foreground">
                      Aucun client trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer bg-white dark:bg-card"
                      onClick={() => router.push(`/clients/${item.id}`)}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <User size={16} weight="duotone" className="text-muted-foreground" />
                          </div>
                          <span className="font-medium">
                            {item.civility === "M" ? "M." : "Mme"} {item.first_name} {item.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{item.phone ?? "—"}</TableCell>
                      <TableCell>{item.email ?? "—"}</TableCell>
                      <TableCell>{item.city ?? "—"}</TableCell>
                      <TableCell>
                        {item.lead_source ? (
                          <Badge variant="outline" className="bg-muted/50">
                            {item.lead_source}
                          </Badge>
                        ) : (
                          "—"
                        )}
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
                                router.push(`/clients/${item.id}`);
                              }}
                            >
                              <Eye size={16} weight="duotone" />
                              Voir détail
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
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
