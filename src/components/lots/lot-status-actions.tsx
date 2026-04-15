"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FloppyDisk } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { Button } from "@/components/ui/button";
import type { LotWithReferences } from "@/types/lot";

interface LotStatusActionsProps {
  lot: LotWithReferences;
}

export function LotStatusActions({ lot }: LotStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Brouillon → Enregistrer
  if (lot.status === "brouillon") {
    return (
      <Button
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const { error } = await mutate(
            supabase.from("lots").update({ updated_at: new Date().toISOString() }).eq("id", lot.id),
            "Erreur lors de l'enregistrement du lot",
            "Statut du lot mis à jour"
          );
          setLoading(false);
          if (error) return;
          router.push(`/dossiers/${lot.dossier_id}`);
        }}
      >
        <FloppyDisk size={16} weight="duotone" />
        {loading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    );
  }

  // Les actions devis/rétractation sont gérées par le système d'actions centralisé
  return null;
}
