"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";

interface ClientToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function ClientToolbar({
  search,
  onSearchChange,
}: ClientToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <MagnifyingGlass size={16} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-[200px] pl-8 text-sm bg-white dark:bg-card"
        />
      </div>
    </div>
  );
}
