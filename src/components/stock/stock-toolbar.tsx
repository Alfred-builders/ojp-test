"use client";

import { MagnifyingGlass, CaretDown, X, Check } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import type { BijouxStock } from "@/types/bijoux";

const statutOptions: { value: BijouxStock["statut"]; label: string }[] = [
  { value: "en_stock", label: "En stock" },
  { value: "en_depot_vente", label: "En dépôt" },
  { value: "vendu", label: "Vendu" },
  { value: "reserve", label: "Réservé" },
  { value: "rendu_client", label: "Rendu client" },
];

const metauxOptions: { value: NonNullable<BijouxStock["metaux"]>; label: string }[] = [
  { value: "Or", label: "Or" },
  { value: "Platine", label: "Platine" },
  { value: "Argent", label: "Argent" },
];

interface StockToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statutFilter: BijouxStock["statut"] | null;
  onStatutFilterChange: (value: BijouxStock["statut"] | null) => void;
  metauxFilter: NonNullable<BijouxStock["metaux"]> | null;
  onMetauxFilterChange: (value: NonNullable<BijouxStock["metaux"]> | null) => void;
}

function FilterPopover({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="bg-white dark:bg-card">
            {label}
            {selected && (
              <Badge variant="secondary" className="ml-1 px-1.5">
                {selected.label}
              </Badge>
            )}
            <CaretDown size={12} weight="regular" className="ml-1 opacity-50" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-48 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            className="flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() =>
              onChange(value === option.value ? null : option.value)
            }
          >
            <span
              className={`mr-2 flex h-4 w-4 items-center justify-center rounded border ${
                value === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              }`}
            >
              {value === option.value && (
                <Check size={10} weight="bold" />
              )}
            </span>
            {option.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function StockToolbar({
  search,
  onSearchChange,
  statutFilter,
  onStatutFilterChange,
  metauxFilter,
  onMetauxFilterChange,
}: StockToolbarProps) {
  const hasFilters = statutFilter !== null || metauxFilter !== null;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <MagnifyingGlass size={16} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-[200px] pl-8 text-sm bg-white dark:bg-card"
        />
      </div>
      <FilterPopover
        label="Statut"
        value={statutFilter}
        options={statutOptions}
        onChange={(v) => onStatutFilterChange(v as BijouxStock["statut"] | null)}
      />
      <FilterPopover
        label="Métal"
        value={metauxFilter}
        options={metauxOptions}
        onChange={(v) =>
          onMetauxFilterChange(v as NonNullable<BijouxStock["metaux"]> | null)
        }
      />
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onStatutFilterChange(null);
            onMetauxFilterChange(null);
          }}
        >
          <X size={14} weight="duotone" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
