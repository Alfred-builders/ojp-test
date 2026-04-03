"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowsDownUp, ArrowUp, ArrowDown, DotsThree, Eye, Trash, Diamond } from "@phosphor-icons/react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { StockToolbar } from "@/components/stock/stock-toolbar";

const statutConfig: Record<
  BijouxStock["statut"],
  { label: string; className: string }
> = {
  en_stock: { label: "En stock", className: "bg-blue-500/10 text-blue-600 border-blue-600/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-400/30" },
  vendu: { label: "Vendu", className: "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20" },
  reserve: { label: "Réservé", className: "bg-amber-500/10 text-amber-600 border-amber-600/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30" },
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

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
            <ArrowUp size={12} weight="fill" />
          ) : (
            <ArrowDown size={12} weight="fill" />
          )
        ) : (
          <ArrowsDownUp size={12} weight="fill" className="opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export function StockTable({ data }: { data: BijouxStock[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<BijouxStock["statut"] | null>(null);
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
          item.description?.toLowerCase().includes(q)
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

  return (
    <div className="space-y-4">
      <StockToolbar
        search={search}
        onSearchChange={setSearch}
        statutFilter={statutFilter}
        onStatutFilterChange={setStatutFilter}
        metauxFilter={metauxFilter}
        onMetauxFilterChange={setMetauxFilter}
      />
      <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <SortableHead sortKey="nom" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="pl-4">
              Nom
            </SortableHead>
            <TableHead>Statut</TableHead>
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
            <TableRow>
              <TableCell colSpan={8} className="h-24 px-4 text-center text-muted-foreground">
                Aucun bijou trouvé.
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
                        <img
                          src={item.photo_url}
                          alt={item.nom}
                          className="h-8 w-8 rounded object-cover"
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
                          />
                        }
                      >
                        <DotsThree size={16} weight="fill" />
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
    </div>
  );
}
