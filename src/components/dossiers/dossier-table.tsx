"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowsDownUp, ArrowUp, ArrowDown, DotsThree, Eye, Trash, FolderOpen, WarningCircle, Lightning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { DossierWithClient, DossierStatus } from "@/types/dossier";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DossierToolbar } from "@/components/dossiers/dossier-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDate } from "@/lib/format";

function clientDisplayName(client: DossierWithClient["client"]) {
  return `${client.civility === "M" ? "M." : "Mme"} ${client.first_name} ${client.last_name}`;
}

type SortKey = "numero" | "client" | "status" | "created_at";
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

interface DossierTableProps {
  data: DossierWithClient[];
  totalItems: number;
  page: number;
  pageSize: number;
  actionCounts?: Record<string, number>;
}

export function DossierTable({ data, totalItems, page, pageSize, actionCounts = {} }: DossierTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DossierStatus | null>(null);
  const [actionsFilter, setActionsFilter] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deletingDossierId, setDeletingDossierId] = useState<string | null>(null);

  async function handleDeleteDossier() {
    if (!deletingDossierId) return;
    const supabase = createClient();
    // Clean up email_logs (no CASCADE)
    await supabase.from("email_logs").delete().eq("dossier_id", deletingDossierId);
    // Delete lots first (lots has ON DELETE RESTRICT, lot_references/reglements/vente_lignes CASCADE from lots)
    const { error: lotsError } = await supabase.from("lots").delete().eq("dossier_id", deletingDossierId);
    if (lotsError) { toast.error("Erreur lors de la suppression des lots du dossier"); setDeletingDossierId(null); return; }
    // Documents CASCADE from dossier, but delete explicitly to be safe
    await supabase.from("documents").delete().eq("dossier_id", deletingDossierId);
    const { error } = await supabase.from("dossiers").delete().eq("id", deletingDossierId);
    setDeletingDossierId(null);
    if (error) { toast.error("Erreur lors de la suppression du dossier"); return; }
    toast.success("Dossier supprimé");
    router.refresh();
  }

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
          item.client.first_name.toLowerCase().includes(q) ||
          item.client.last_name.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (actionsFilter) {
      result = result.filter((item) => (actionCounts[item.id] ?? 0) > 0);
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal: string;
        let bVal: string;
        if (sortKey === "client") {
          aVal = a.client.last_name;
          bVal = b.client.last_name;
        } else {
          aVal = a[sortKey] ?? "";
          bVal = b[sortKey] ?? "";
        }
        const cmp = String(aVal).localeCompare(String(bVal), "fr");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, statusFilter, actionsFilter, actionCounts, sortKey, sortDir]);

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
      <DossierToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        actionsFilter={actionsFilter}
        onActionsFilterChange={setActionsFilter}
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
              <SortableHead sortKey="created_at" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Date
              </SortableHead>
              <TableHead className="text-center">Actions</TableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-24 px-4 text-center text-muted-foreground">
                  Aucun dossier trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer bg-white dark:bg-card"
                  onClick={() => router.push(`/dossiers/${item.id}`)}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <FolderOpen size={16} weight="duotone" className="text-muted-foreground" />
                      </div>
                      <span className="font-medium">{item.numero}</span>
                    </div>
                  </TableCell>
                  <TableCell>{clientDisplayName(item.client)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        item.status === "finalise"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                          : item.status === "en_cours"
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                      }
                    >
                      {item.status === "finalise" ? "Finalisé" : item.status === "en_cours" ? "En cours" : "Brouillon"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(item.created_at)}</TableCell>
                  <TableCell className="text-center">
                    {(actionCounts[item.id] ?? 0) > 0 ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Lightning size={10} weight="duotone" className="mr-0.5" />
                        {actionCounts[item.id]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
                            router.push(`/dossiers/${item.id}`);
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
                            setDeletingDossierId(item.id);
                          }}
                        >
                          <Trash size={16} weight="duotone" />
                          Supprimer
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

      <Dialog open={!!deletingDossierId} onOpenChange={(open) => { if (!open) setDeletingDossierId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WarningCircle size={20} weight="duotone" className="text-destructive" />
              Supprimer le dossier
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce dossier et tous ses lots associés ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeletingDossierId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteDossier}>
              <Trash size={14} weight="duotone" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
