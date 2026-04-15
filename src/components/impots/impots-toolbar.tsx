"use client";

import { useState } from "react";
import { MagnifyingGlass, X, Funnel } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaxeType } from "@/types/impots";

const TAXE_TYPE_OPTIONS: { value: TaxeType; label: string }[] = [
  { value: "TMP", label: "TMP (Métaux Précieux)" },
  { value: "TFOP", label: "TFOP (Objets Précieux)" },
  { value: "TPV", label: "TPV (Plus-Value)" },
  { value: "TVA", label: "TVA (Ventes)" },
];

interface ImpotsToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilters: TaxeType[];
  onTypeFiltersChange: (v: TaxeType[]) => void;
}

export function ImpotsToolbar({
  search,
  onSearchChange,
  typeFilters,
  onTypeFiltersChange,
}: ImpotsToolbarProps) {
  const [typeOpen, setTypeOpen] = useState(false);
  const hasFilters = typeFilters.length > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlass
          size={16}
          weight="regular"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Rechercher par client ou référence..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white dark:bg-card"
        />
      </div>

      <Popover open={typeOpen} onOpenChange={setTypeOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="bg-white dark:bg-card">
              <Funnel size={14} weight="duotone" />
              Type
              {typeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {typeFilters.length}
                </Badge>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-56 p-2" align="start">
          {TAXE_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer text-sm"
            >
              <Checkbox
                checked={typeFilters.includes(opt.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onTypeFiltersChange([...typeFilters, opt.value]);
                  } else {
                    onTypeFiltersChange(typeFilters.filter((t) => t !== opt.value));
                  }
                }}
              />
              {opt.label}
            </label>
          ))}
        </PopoverContent>
      </Popover>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTypeFiltersChange([])}
        >
          <X size={14} weight="regular" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
