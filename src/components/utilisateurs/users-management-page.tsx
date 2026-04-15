"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowsDownUp,
  ArrowUp,
  ArrowDown,
  DotsThree,
  Crown,
  Storefront,
  Trash,
  ShieldStar,
  UserSwitch,
  UserCheck,
  UserMinus,
  Link as LinkIcon,
  Copy,
  Check,
} from "@phosphor-icons/react";
import type { UserProfile, UserRole } from "@/types/auth";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

type SortKey = "name" | "email" | "role" | "created_at";
type SortDir = "asc" | "desc";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: {
    label: "Actif",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
  },
  pending: {
    label: "En attente",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/30",
  },
  inactive: {
    label: "Inactif",
    className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30",
  },
  deleted: {
    label: "Supprimé",
    className: "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400 dark:hover:bg-gray-900/30",
  },
};

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  proprietaire: "Propriétaire",
  vendeur: "Vendeur",
};

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
  currentUserRole: UserRole;
}

export function UsersManagementPage({
  users,
  currentUserId,
  currentUserRole,
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
  const [linkTarget, setLinkTarget] = useState<UserProfile | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const isSuperAdmin = currentUserRole === "super_admin";

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
    let result = users.filter((u) => u.status !== "deleted");

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
        toast.success(newStatus === "active" ? "Utilisateur activé" : "Utilisateur désactivé");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Erreur lors du changement de statut");
      }
    } catch {
      toast.error("Erreur réseau lors du changement de statut");
    } finally {
      setToggling(null);
    }
  }

  async function handleChangeRole(userId: string, newRole: UserRole) {
    setToggling(userId);
    try {
      const res = await fetch(`/api/users/${userId}/toggle-active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(`Rôle modifié en ${ROLE_LABEL[newRole]}`);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erreur lors du changement de rôle");
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
        toast.success("Utilisateur supprimé");
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

  async function handleGetInviteLink(user: UserProfile) {
    setLinkTarget(user);
    setInviteLink(null);
    setLinkLoading(true);
    setLinkCopied(false);
    try {
      const res = await fetch(`/api/users/${user.id}/invite-link`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.inviteLink) {
        setInviteLink(data.inviteLink);
      } else {
        toast.error(data.error ?? "Erreur lors de la récupération du lien");
        setLinkTarget(null);
      }
    } catch {
      toast.error("Erreur réseau");
      setLinkTarget(null);
    } finally {
      setLinkLoading(false);
    }
  }

  function handleCopyInviteLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function canManageUser(u: UserProfile) {
    if (u.id === currentUserId) return false;
    if (isSuperAdmin) return true;
    // proprietaire can manage vendeur only
    if (currentUserRole === "proprietaire" && u.role === "vendeur") return true;
    return false;
  }

  function canChangeRole(u: UserProfile) {
    if (u.id === currentUserId) return false;
    if (isSuperAdmin && u.role !== "super_admin") return true;
    return false;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
          className="max-w-sm"
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
                const statusBadge = STATUS_BADGE[u.status] ?? STATUS_BADGE.active;

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
                        variant={u.role === "super_admin" ? "default" : u.role === "proprietaire" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {u.role === "super_admin" ? (
                          <ShieldStar size={12} weight="duotone" />
                        ) : u.role === "proprietaire" ? (
                          <Crown size={12} weight="duotone" />
                        ) : (
                          <Storefront size={12} weight="duotone" />
                        )}
                        {ROLE_LABEL[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell className="pr-4">
                      {canManageUser(u) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-xs" aria-label="Actions" />
                            }
                          >
                            <DotsThree size={16} weight="bold" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
                            {u.status !== "active" && (
                              <DropdownMenuItem
                                disabled={toggling === u.id}
                                onClick={() => handleSetStatus(u.id, "active")}
                              >
                                <UserCheck size={16} weight="duotone" />
                                Activer
                              </DropdownMenuItem>
                            )}
                            {u.status === "pending" && (
                              <DropdownMenuItem
                                onClick={() => handleGetInviteLink(u)}
                              >
                                <LinkIcon size={16} weight="duotone" />
                                Voir le lien d&apos;invitation
                              </DropdownMenuItem>
                            )}
                            {u.status === "active" && (
                              <DropdownMenuItem
                                disabled={toggling === u.id}
                                onClick={() => handleSetStatus(u.id, "inactive")}
                              >
                                <UserMinus size={16} weight="duotone" />
                                Désactiver
                              </DropdownMenuItem>
                            )}
                            {canChangeRole(u) && (
                              <>
                                <DropdownMenuSeparator />
                                {u.role !== "proprietaire" && (
                                  <DropdownMenuItem
                                    disabled={toggling === u.id}
                                    onClick={() => handleChangeRole(u.id, "proprietaire")}
                                  >
                                    <UserSwitch size={16} weight="duotone" />
                                    Passer Propriétaire
                                  </DropdownMenuItem>
                                )}
                                {u.role !== "vendeur" && (
                                  <DropdownMenuItem
                                    disabled={toggling === u.id}
                                    onClick={() => handleChangeRole(u.id, "vendeur")}
                                  >
                                    <UserSwitch size={16} weight="duotone" />
                                    Passer Vendeur
                                  </DropdownMenuItem>
                                )}
                              </>
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
              Vous êtes sur le point de supprimer{" "}
              <span className="font-medium text-foreground">
                {deleteTarget
                  ? [deleteTarget.first_name, deleteTarget.last_name].filter(Boolean).join(" ") || deleteTarget.email
                  : ""}
              </span>
              . Cette action est irréversible.
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

      {/* Dialog lien d'invitation */}
      <Dialog open={!!linkTarget} onOpenChange={(open) => { if (!open) { setLinkTarget(null); setInviteLink(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon size={20} weight="duotone" />
              Lien d&apos;invitation
            </DialogTitle>
            <DialogDescription>
              Lien de connexion pour{" "}
              <span className="font-medium text-foreground">
                {linkTarget ? [linkTarget.first_name, linkTarget.last_name].filter(Boolean).join(" ") || linkTarget.email : ""}
              </span>
            </DialogDescription>
          </DialogHeader>
          {linkLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chargement du lien...</p>
          ) : inviteLink ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Lien à partager</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="text-xs font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button variant="outline" size="icon-sm" onClick={handleCopyInviteLink}>
                  {linkCopied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => { setLinkTarget(null); setInviteLink(null); }}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
