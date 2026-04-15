"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowsDownUp, ArrowUp, ArrowDown, DotsThree, Eye, HandCoins, UserCircle, ArrowUUpLeft } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import type { BijouxStock } from "@/types/bijoux";
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
import { ConfieAchatToolbar } from "@/components/confie-achat/confie-achat-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency, formatDate } from "@/lib/format";

export interface ConfieAchatItem extends BijouxStock {
  deposant_name: string | null;
  deposant_client_id: string | null;
  lot_numero: string | null;
  lot_id: string | null;
  date_depot: string | null;
}

const statutConfig: Record<
  "en_depot_vente" | "vendu" | "rendu_client",
  { label: string; className: string }
> = {
  en_depot_vente: { label: "En dépôt", className: "bg-cyan-500/10 text-cyan-600 border-cyan-600/30 dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-400/30" },
  vendu: { label: "Vendu", className: "bg-emerald-500/10 text-emerald-600 border-emerald-600/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30" },
  rendu_client: { label: "Rendu client", className: "bg-gray-500/10 text-gray-600 border-gray-600/30 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-400/30" },
};

type SortKey = "nom" | "deposant_name" | "poids" | "prix_achat" | "prix_revente" | "metaux" | "date_depot";
type SortDir = "asc" | "desc";
type ConfieStatut = "en_depot_vente" | "vendu" | "rendu_client";

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

interface ConfieAchatTableProps {
  data: ConfieAchatItem[];
  canEdit?: boolean;
  totalItems: number;
  page: number;
  pageSize: number;
}

export function ConfieAchatTable({ data, canEdit = true, totalItems, page, pageSize }: ConfieAchatTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<ConfieStatut | null>(null);
  const [metauxFilter, setMetauxFilter] = useState<NonNullable<BijouxStock["metaux"]> | null>(null);
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
          item.deposant_name?.toLowerCase().includes(q) ||
          item.lot_numero?.toLowerCase().includes(q)
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
        const aVal = a[sortKey as keyof ConfieAchatItem];
        const bVal = b[sortKey as keyof ConfieAchatItem];
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
      <div className="shrink-0">
        <ConfieAchatToolbar
          search={search}
          onSearchChange={setSearch}
          statutFilter={statutFilter}
          onStatutFilterChange={setStatutFilter}
          metauxFilter={metauxFilter}
          onMetauxFilterChange={setMetauxFilter}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white dark:bg-card">
        <Table className={filtered.length === 0 ? "h-full" : ""}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="bg-transparent hover:bg-transparent">
              <SortableHead sortKey="nom" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="pl-4">
                Nom
              </SortableHead>
              <TableHead>Statut</TableHead>
              <SortableHead sortKey="deposant_name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Déposant
              </SortableHead>
              <SortableHead sortKey="date_depot" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Date de dépôt
              </SortableHead>
              <SortableHead sortKey="metaux" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Métal
              </SortableHead>
              <SortableHead sortKey="poids" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                Poids
              </SortableHead>
              <SortableHead sortKey="prix_achat" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                Prix déposant
              </SortableHead>
              <SortableHead sortKey="prix_revente" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                Prix public
              </SortableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="bg-white dark:bg-card hover:bg-white dark:hover:bg-card">
                <TableCell colSpan={9} className="h-24 px-4 text-center text-muted-foreground">
                  Aucun confié d&apos;achat trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const statut = statutConfig[item.statut as keyof typeof statutConfig] ?? { label: item.statut, className: "" };
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer bg-white dark:bg-card"
                    onClick={() => router.push(`/confie-achat/${item.id}`)}
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
                            <HandCoins size={16} weight="duotone" className="text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{item.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statut.className}>{statut.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.deposant_name ? (
                        <div className="flex items-center gap-1.5">
                          <UserCircle size={14} weight="duotone" className="text-muted-foreground shrink-0" />
                          <span className="text-sm">{item.deposant_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(item.date_depot)}
                      </span>
                    </TableCell>
                    <TableCell>{item.metaux ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {item.poids_net !== null ? `${item.poids_net} g` : item.poids !== null ? `${item.poids} g` : "—"}
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
                              router.push(`/confie-achat/${item.id}`);
                            }}
                          >
                            <Eye size={16} weight="duotone" />
                            Voir détail
                          </DropdownMenuItem>
                          {canEdit && item.statut === "en_depot_vente" && (
                            <DropdownMenuItem
                              onClick={async (e: React.MouseEvent) => {
                                e.stopPropagation();
                                const supabase = createClient();
                                const { error } = await mutate(
                                  supabase.from("bijoux_stock").update({ statut: "rendu_client" }).eq("id", item.id),
                                  "Erreur lors de la restitution",
                                  "Article restitué au client"
                                );
                                if (error) return;
                                router.refresh();
                              }}
                            >
                              <ArrowUUpLeft size={16} weight="duotone" />
                              Restituer au client
                            </DropdownMenuItem>
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
