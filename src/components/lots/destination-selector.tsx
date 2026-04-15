"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DESTINATION_OPTIONS } from "@/lib/validations/lot";
import type { LotWithReferences, ReferenceDestination } from "@/types/lot";

interface DestinationSelectorProps {
  lot: LotWithReferences;
}

export function DestinationSelector({ lot }: DestinationSelectorProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleDestinationChange(refId: string, destination: string) {
    const { error } = await mutate(
      supabase
        .from("lot_references")
        .update({ destination: destination as ReferenceDestination })
        .eq("id", refId),
      "Erreur lors de la mise à jour de la destination",
      "Destination mise à jour"
    );
    if (error) return;
    router.refresh();
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <MapPin size={20} weight="duotone" />
          Destination des références
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Sélectionnez la destination de chaque référence avant de finaliser le lot.
        </p>
        {lot.references.map((ref) => (
          <div key={ref.id} className="flex items-center justify-between gap-4 rounded-lg border bg-white dark:bg-card p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ref.designation}</p>
              <p className="text-xs text-muted-foreground">
                {ref.categorie === "bijoux" ? "Bijoux" : "Or Investissement"}
                {ref.metal ? ` — ${ref.metal}` : ""}
                {ref.poids_net ? ` — ${ref.poids_net}g` : ref.poids ? ` — ${ref.poids}g` : ""}
              </p>
            </div>
            <Select
              value={ref.destination ?? ""}
              onValueChange={(v) => { if (v) handleDestinationChange(ref.id, v); }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent>
                {DESTINATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
