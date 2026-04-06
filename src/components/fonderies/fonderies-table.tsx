"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  MagnifyingGlass,
  Plus,
  DotsThree,
  Eye,
  Trash,
  ArrowUp,
  ArrowDown,
  ArrowsDownUp,
  Factory,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { Fonderie } from "@/types/fonderie";

type SortKey = "nom" | "ville" | "telephone";
type SortDir = "asc" | "desc";

function SortableHead({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <TableHead
      className="cursor-pointer select-none transition-colors hover:text-foreground"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? <ArrowUp size={12} weight="regular" /> : <ArrowDown size={12} weight="regular" />
        ) : (
          <ArrowsDownUp size={12} weight="regular" className="opacity-40" />
        )}
      </span>
    </TableHead>
  );
}

interface FonderiesTableProps {
  fonderies: Fonderie[];
  totalItems: number;
  page: number;
  pageSize: number;
}

export function FonderiesTable({ fonderies, totalItems, page, pageSize }: FonderiesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nom");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await mutate(
      supabase.from("fonderies").delete().eq("id", id),
      "Erreur lors de la suppression de la fonderie"
    );
    if (error) return;
    router.refresh();
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
    let items = [...fonderies];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (f) =>
          f.nom.toLowerCase().includes(q) ||
          (f.ville?.toLowerCase().includes(q)) ||
          (f.email?.toLowerCase().includes(q)) ||
          (f.telephone?.includes(q))
      );
    }

    items.sort((a, b) => {
      const aVal = (a[sortKey] ?? "").toLowerCase();
      const bVal = (b[sortKey] ?? "").toLowerCase();
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return items;
  }, [fonderies, search, sortKey, sortDir]);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm">
          <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une fonderie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={() => router.push("/fonderies/new")}>
          <Plus size={14} weight="bold" />
          Nouvelle fonderie
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border bg-white dark:bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="bg-transparent hover:bg-transparent">
              <SortableHead label="Nom" sortKey="nom" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Ville" sortKey="ville" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Téléphone" sortKey="telephone" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <TableHead>Email</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  <Factory size={32} weight="duotone" className="mx-auto mb-2 opacity-40" />
                  Aucune fonderie trouvée.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow
                  key={f.id}
                  className="cursor-pointer bg-white dark:bg-card"
                  onClick={() => router.push(`/fonderies/${f.id}`)}
                >
                  <TableCell className="font-medium">{f.nom}</TableCell>
                  <TableCell className="text-muted-foreground">{f.ville ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{f.telephone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{f.email ?? "—"}</TableCell>
                  <TableCell>
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
                            router.push(`/fonderies/${f.id}`);
                          }}
                        >
                          <Eye size={14} weight="duotone" />
                          Voir détail
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setDeletingId(f.id);
                          }}
                        >
                          <Trash size={14} weight="duotone" />
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

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette fonderie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La fonderie sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingId) handleDelete(deletingId);
                setDeletingId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
