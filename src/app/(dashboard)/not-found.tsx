import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <MagnifyingGlass size={48} weight="duotone" className="text-muted-foreground" />
        <h2 className="text-lg font-semibold">Page introuvable</h2>
        <p className="text-sm text-muted-foreground">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
