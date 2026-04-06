"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowsDownUp,
  ArrowUp,
  ArrowDown,
  DotsThree,
  CheckCircle,
  XCircle,
  Crown,
  Storefront,
  Trash,
  HourglassSimple,
} from "@phosphor-icons/react";
import type { UserProfile } from "@/types/auth";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

type SortKey = "name" | "email" | "role" | "created_at";
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

interface UsersManagementPageProps {
  users: UserProfile[];
  currentUserId: string;
}

export function UsersManagementPage({
  users,
  currentUserId,
}: UsersManagementPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function getName(u: UserProfile) {
    return [u.first_name, u.last_name].filter(Boolean).join(" ") || "Sans nom";
  }

  const filtered = useMemo(() => {
    let result = users;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          getName(u).toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name") {
          cmp = getName(a).localeCompare(getName(b), "fr");
        } else if (sortKey === "email") {
          cmp = (a.email ?? "").localeCompare(b.email ?? "", "fr");
        } else if (sortKey === "role") {
          cmp = a.role.localeCompare(b.role);
        } else if (sortKey === "created_at") {
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [users, search, sortKey, sortDir]);

  const totalItems = filtered.length;
  const paginatedData = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  async function handleSetStatus(userId: string, newStatus: "active" | "inactive") {
    setToggling(userId);
    try {
      const res = await fetch(`/api/users/${userId}/toggle-active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}/delete`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Utilisateur supprime");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erreur lors de la suppression");
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
          className="max-w-sm bg-white dark:bg-card"
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white dark:bg-card">
        <Table className={paginatedData.length === 0 ? "h-full" : ""}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="bg-transparent hover:bg-transparent">
              <SortableHead sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="pl-4">
                Nom
              </SortableHead>
              <SortableHead sortKey="email" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Email
              </SortableHead>
              <SortableHead sortKey="role" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Rôle
              </SortableHead>
              <TableHead>Statut</TableHead>
              <SortableHead sortKey="created_at" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Créé le
              </SortableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow className="bg-white dark:bg-card hover:bg-white dark:hover:bg-card">
                <TableCell colSpan={6} className="h-24 px-4 text-center text-muted-foreground">
                  Aucun utilisateur trouvé.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((u) => {
                const isCurrentUser = u.id === currentUserId;
                const fullName = getName(u);

                return (
                  <TableRow key={u.id} className="bg-white dark:bg-card">
                    <TableCell className="pl-4 font-medium">
                      <div className="flex items-center gap-2">
                        {fullName}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            Vous
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === "proprietaire" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {u.role === "proprietaire" ? (
                          <Crown size={12} weight="duotone" />
                        ) : (
                          <Storefront size={12} weight="duotone" />
                        )}
                        {u.role === "proprietaire" ? "Propriétaire" : "Vendeur"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.status === "active" && (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                          <CheckCircle size={14} weight="duotone" />
                          Actif
                        </span>
                      )}
                      {u.status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                          <HourglassSimple size={14} weight="duotone" />
                          En attente
                        </span>
                      )}
                      {u.status === "inactive" && (
                        <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                          <XCircle size={14} weight="duotone" />
                          Inactif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell className="pr-4">
                      {!isCurrentUser && u.role !== "proprietaire" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-xs" aria-label="Actions" />
                            }
                          >
                            <DotsThree size={16} weight="regular" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {u.status !== "active" && (
                              <DropdownMenuItem
                                disabled={toggling === u.id}
                                onClick={() => handleSetStatus(u.id, "active")}
                              >
                                <CheckCircle size={16} weight="duotone" />
                                Activer
                              </DropdownMenuItem>
                            )}
                            {u.status === "active" && (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={toggling === u.id}
                                onClick={() => handleSetStatus(u.id, "inactive")}
                              >
                                <XCircle size={16} weight="duotone" />
                                Desactiver
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash size={16} weight="duotone" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        totalItems={totalItems}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous etes sur le point de supprimer{" "}
              <span className="font-medium text-foreground">
                {deleteTarget
                  ? [deleteTarget.first_name, deleteTarget.last_name].filter(Boolean).join(" ") || deleteTarget.email
                  : ""}
              </span>
              . Cette action est irreversible. Le compte et toutes ses donnees seront definitivement supprimes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash size={16} weight="duotone" />
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
