"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PreviewSkeleton } from "@/components/preview/preview-skeleton";
import { PreviewLink } from "@/components/preview/preview-link";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { formatDate } from "@/lib/format";

interface DossierData {
  id: string;
  numero: string;
  status: string;
  notes: string | null;
  created_at: string;
  client: {
    id: string;
    civility: string;
    first_name: string;
    last_name: string;
    is_valid: boolean;
  };
}

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon",
  en_cours: "En cours",
  finalise: "Finalisé",
};

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  brouillon: "secondary",
  en_cours: "default",
  finalise: "outline",
};

export default function DossierPreview({ id }: { id: string }) {
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    supabase
      .from("dossiers")
      .select("id, numero, status, notes, created_at, client:clients(id, civility, first_name, last_name, is_valid)")
      .eq("id", id)
      .single()
      .then(({ data, error: err }) => {
        if (aborted) return;
        if (err || !data) {
          setError("Impossible de charger le dossier.");
        } else {
          setDossier(data as unknown as DossierData);
        }
        setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [id]);

  if (loading) return <PreviewSkeleton />;
  if (error || !dossier) {
    return (
      <p className="text-sm text-destructive py-8 text-center">
        {error ?? "Dossier introuvable."}
      </p>
    );
  }

  const clientName = `${dossier.client.civility === "M" ? "M." : "Mme"} ${dossier.client.first_name} ${dossier.client.last_name}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-medium text-base">{dossier.numero}</span>
        <Badge variant={statusVariants[dossier.status] ?? "secondary"}>
          {statusLabels[dossier.status] ?? dossier.status}
        </Badge>
      </div>

      <div className="divide-y">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Client</span>
          <span className="text-sm font-medium inline-flex items-center gap-1.5">
            {clientName}
            <PreviewLink
              entityType="client"
              entityId={dossier.client.id}
              href={`/clients/${dossier.client.id}`}
            >
              <ArrowSquareOut
                size={14}
                weight="duotone"
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </PreviewLink>
          </span>
        </div>
        <PreviewRow label="Statut client" value={dossier.client.is_valid ? "Valide" : "Non valide"} />
        <PreviewRow label="Créé le" value={formatDate(dossier.created_at)} />
        {dossier.notes && (
          <div className="py-2">
            <span className="text-sm text-muted-foreground">Notes</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{dossier.notes}</p>
          </div>
        )}
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
