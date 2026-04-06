"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";

export function SearchTrigger() {
  function handleClick() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      })
    );
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Recherche"
      className="inline-flex items-center gap-2 rounded-lg border bg-white dark:bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
    >
      <MagnifyingGlass size={14} weight="duotone" />
      <span className="hidden sm:inline">Recherche</span>
      <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
        ⌘K
      </kbd>
    </button>
  );
}
