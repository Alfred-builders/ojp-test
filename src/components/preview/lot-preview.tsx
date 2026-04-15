"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PreviewSkeleton } from "@/components/preview/preview-skeleton";
import { PreviewLink } from "@/components/preview/preview-link";
import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { formatDate } from "@/lib/format";
import type { LotStatus } from "@/types/lot";

interface LotData {
  id: string;
  numero: string;
  type: string;
  status: string;
  outcome: string | null;
  total_prix_achat: number;
  total_prix_revente: number;
  notes: string | null;
  created_at: string;
  dossier: {
    id: string;
    numero: string;
    client: {
      id: string;
      civility: string;
      first_name: string;
      last_name: string;
    };
  };
}

const typeLabels: Record<string, string> = {
  rachat: "Rachat",
  depot_vente: "Dépôt-vente",
  vente: "Vente",
};

export default function LotPreview({ id }: { id: string }) {
  const [lot, setLot] = useState<LotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    supabase
      .from("lots")
      .select("id, numero, type, status, total_prix_achat, total_prix_revente, notes, created_at, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name))")
      .eq("id", id)
      .single()
      .then(({ data, error: err }) => {
        if (aborted) return;
        if (err || !data) {
          setError("Impossible de charger le lot.");
        } else {
          setLot(data as unknown as LotData);
        }
        setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [id]);

  if (loading) return <PreviewSkeleton />;
  if (error || !lot) {
    return (
      <p className="text-sm text-destructive py-8 text-center">
        {error ?? "Lot introuvable."}
      </p>
    );
  }

  const clientName = `${lot.dossier.client.civility === "M" ? "M." : "Mme"} ${lot.dossier.client.first_name} ${lot.dossier.client.last_name}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-medium text-base">{lot.numero}</span>
        <LotStatusBadge status={lot.status as LotStatus} outcome={lot.outcome as import("@/types/lot").LotOutcome | null} />
      </div>

      <div className="divide-y">
        <PreviewRow label="Type" value={typeLabels[lot.type] ?? lot.type} />
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Dossier</span>
          <span className="text-sm font-medium inline-flex items-center gap-1.5">
            {lot.dossier.numero}
            <PreviewLink
              entityType="dossier"
              entityId={lot.dossier.id}
              href={`/dossiers/${lot.dossier.id}`}
            >
              <ArrowSquareOut
                size={14}
                weight="duotone"
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </PreviewLink>
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Client</span>
          <span className="text-sm font-medium inline-flex items-center gap-1.5">
            {clientName}
            <PreviewLink
              entityType="client"
              entityId={lot.dossier.client.id}
              href={`/clients/${lot.dossier.client.id}`}
            >
              <ArrowSquareOut
                size={14}
                weight="duotone"
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </PreviewLink>
          </span>
        </div>
        <PreviewRow
          label="Prix d'achat"
          value={`${lot.total_prix_achat.toFixed(2)} €`}
        />
        <PreviewRow
          label="Prix de revente"
          value={`${lot.total_prix_revente.toFixed(2)} €`}
        />
        <PreviewRow label="Créé le" value={formatDate(lot.created_at)} />
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
