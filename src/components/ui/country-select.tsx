"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_OPTIONS } from "@/lib/validations/client";

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function CountrySelect({ value, onValueChange, placeholder = "Sélectionner" }: CountrySelectProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? COUNTRY_OPTIONS.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : COUNTRY_OPTIONS;

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? "")}>
      <SelectTrigger>
        {value || <SelectValue placeholder={placeholder} />}
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <div className="flex items-center gap-2 px-2 pb-2 sticky top-0 bg-popover z-10">
          <MagnifyingGlass size={14} className="shrink-0 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Rechercher un pays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucun pays trouvé.</p>
        ) : (
          filtered.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
