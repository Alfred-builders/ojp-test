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

type ConfieStatut = "en_depot_vente" | "vendu" | "rendu_client";
type Metal = "Or" | "Platine" | "Argent";

const statutOptions: { value: ConfieStatut; label: string }[] = [
  { value: "en_depot_vente", label: "En dépôt" },
  { value: "vendu", label: "Vendu" },
  { value: "rendu_client", label: "Rendu client" },
];

const metauxOptions: { value: Metal; label: string }[] = [
  { value: "Or", label: "Or" },
  { value: "Platine", label: "Platine" },
  { value: "Argent", label: "Argent" },
];

interface ConfieAchatToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statutFilter: ConfieStatut | null;
  onStatutFilterChange: (value: ConfieStatut | null) => void;
  metauxFilter: Metal | null;
  onMetauxFilterChange: (value: Metal | null) => void;
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

export function ConfieAchatToolbar({
  search,
  onSearchChange,
  statutFilter,
  onStatutFilterChange,
  metauxFilter,
  onMetauxFilterChange,
}: ConfieAchatToolbarProps) {
  const hasFilters = statutFilter !== null || metauxFilter !== null;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <MagnifyingGlass size={16} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, déposant..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-[240px] pl-8 text-sm bg-white dark:bg-card"
        />
      </div>
      <FilterPopover
        label="Statut"
        value={statutFilter}
        options={statutOptions}
        onChange={(v) => onStatutFilterChange(v as ConfieStatut | null)}
      />
      <FilterPopover
        label="Métal"
        value={metauxFilter}
        options={metauxOptions}
        onChange={(v) => onMetauxFilterChange(v as Metal | null)}
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
