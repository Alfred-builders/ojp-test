import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";

/** Lien interne vers une page de l'app — s'ouvre dans un nouvel onglet avec animation au hover */
export function AppLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="group/link inline-flex items-center gap-0 rounded-md px-1.5 py-0.5 -mx-1 -my-0.5 font-medium text-foreground transition-colors cursor-pointer hover:bg-muted"
    >
      {children}
      <span className="inline-flex items-center overflow-hidden transition-all duration-200 w-0 opacity-0 group-hover/link:w-4 group-hover/link:opacity-60">
        <CaretRight weight="bold" className="ml-1 size-3 shrink-0 text-foreground" />
      </span>
    </Link>
  );
}
