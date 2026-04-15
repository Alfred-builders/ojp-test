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
import { NATIONALITY_OPTIONS } from "@/lib/validations/client";

// Dédupliquer les nationalités (certains pays partagent la même)
const UNIQUE_NATIONALITIES = [...new Set(NATIONALITY_OPTIONS)];

interface NationalitySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function NationalitySelect({ value, onValueChange, placeholder = "Sélectionner" }: NationalitySelectProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? UNIQUE_NATIONALITIES.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    : UNIQUE_NATIONALITIES;

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
            placeholder="Rechercher une nationalité..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucune nationalité trouvée.</p>
        ) : (
          filtered.map((n) => (
            <SelectItem key={n} value={n}>{n}</SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
