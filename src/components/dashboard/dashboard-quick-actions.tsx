import Link from "next/link";
import { UserPlus, FolderPlus } from "@phosphor-icons/react/dist/ssr";

export function DashboardQuickActions() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/clients/new"
        className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
      >
        <UserPlus size={16} weight="duotone" />
        Nouveau client
      </Link>
      <Link
        href="/dossiers/new"
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <FolderPlus size={16} weight="duotone" />
        Nouveau dossier
      </Link>
    </div>
  );
}
