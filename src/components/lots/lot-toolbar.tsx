"use client";

import { useState } from "react";
import { MagnifyingGlass, X, Funnel } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { LOT_STATUS_OPTIONS } from "@/lib/validations/lot";
import type { LotStatus } from "@/types/lot";

interface LotToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilters: LotStatus[];
  onStatusFiltersChange: (v: LotStatus[]) => void;
}

export function LotToolbar({
  search,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
}: LotToolbarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const hasFilters = statusFilters.length > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlass
          size={16}
          weight="regular"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Rechercher un lot..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white dark:bg-card"
        />
      </div>

      {/* Status filter */}
      <Popover open={statusOpen} onOpenChange={setStatusOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="bg-white dark:bg-card">
              <Funnel size={14} weight="duotone" />
              Statut
              {statusFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {statusFilters.length}
                </Badge>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-48 p-2" align="start">
          {LOT_STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer text-sm"
            >
              <Checkbox
                checked={statusFilters.includes(opt.value as LotStatus)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onStatusFiltersChange([...statusFilters, opt.value as LotStatus]);
                  } else {
                    onStatusFiltersChange(statusFilters.filter((s) => s !== opt.value));
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
          onClick={() => onStatusFiltersChange([])}
        >
          <X size={14} weight="regular" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
