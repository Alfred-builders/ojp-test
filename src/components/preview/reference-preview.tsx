"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PreviewSkeleton } from "@/components/preview/preview-skeleton";
import { PreviewLink } from "@/components/preview/preview-link";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { formatCurrency, formatDate } from "@/lib/format";
import { REF_STATUS_CONFIG } from "@/components/references/reference-status-config";
import type { ReferenceStatus } from "@/types/lot";

interface RefData {
  id: string;
  designation: string;
  categorie: string;
  metal: string | null;
  qualite: string | null;
  poids: number | null;
  quantite: number;
  prix_achat: number;
  prix_revente_estime: number | null;
  status: ReferenceStatus;
  type_rachat: string;
  destination: string | null;
  montant_taxe: number;
  created_at: string;
  lot: {
    id: string;
    numero: string;
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
  };
}

export default function ReferencePreview({ id }: { id: string }) {
  const [ref, setRef] = useState<RefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    supabase
      .from("lot_references")
      .select("id, designation, categorie, metal, qualite, poids, quantite, prix_achat, prix_revente_estime, status, type_rachat, destination, montant_taxe, created_at, lot:lots(id, numero, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name)))")
      .eq("id", id)
      .single()
      .then(({ data, error: err }) => {
        if (aborted) return;
        if (err || !data) {
          setError("Impossible de charger la référence.");
        } else {
          setRef(data as unknown as RefData);
        }
        setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [id]);

  if (loading) return <PreviewSkeleton />;
  if (error || !ref) {
    return (
      <p className="text-sm text-destructive py-8 text-center">
        {error ?? "Référence introuvable."}
      </p>
    );
  }

  const statusConfig = REF_STATUS_CONFIG[ref.status];
  const clientName = `${ref.lot.dossier.client.civility === "M" ? "M." : "Mme"} ${ref.lot.dossier.client.first_name} ${ref.lot.dossier.client.last_name}`;
  const destinationLabels: Record<string, string> = {
    stock_boutique: "Stock boutique",
    fonderie: "Fonderie",
    depot_vente: "Dépôt-vente",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-medium text-base">{ref.designation}</span>
        <Badge variant="secondary" className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </div>

      <div className="divide-y">
        <PreviewRow label="Catégorie" value={ref.categorie === "bijoux" ? "Bijoux" : "Or investissement"} />
        {ref.metal && <PreviewRow label="Métal" value={ref.metal} />}
        {ref.qualite && <PreviewRow label="Titrage" value={ref.qualite} />}
        {ref.poids && <PreviewRow label="Poids" value={`${ref.poids}g`} />}
        <PreviewRow label="Quantité" value={`×${ref.quantite}`} />
        <PreviewRow label="Prix d'achat" value={`${formatCurrency(ref.prix_achat)}/u`} />
        <PreviewRow label="Total" value={formatCurrency(ref.prix_achat * ref.quantite)} />
        {ref.prix_revente_estime && (
          <PreviewRow label="Revente estimée" value={formatCurrency(ref.prix_revente_estime)} />
        )}
        {ref.destination && (
          <PreviewRow label="Destination" value={destinationLabels[ref.destination] ?? ref.destination} />
        )}
        <PreviewRow label="Type" value={ref.type_rachat === "devis" ? "Devis" : "Direct"} />
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Lot</span>
          <span className="text-sm font-medium inline-flex items-center gap-1.5">
            {ref.lot.numero}
            <PreviewLink entityType="lot" entityId={ref.lot.id} href={`/lots/${ref.lot.id}`}>
              <ArrowSquareOut size={14} weight="duotone" className="text-muted-foreground hover:text-foreground transition-colors" />
            </PreviewLink>
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Client</span>
          <span className="text-sm font-medium inline-flex items-center gap-1.5">
            {clientName}
            <PreviewLink entityType="client" entityId={ref.lot.dossier.client.id} href={`/clients/${ref.lot.dossier.client.id}`}>
              <ArrowSquareOut size={14} weight="duotone" className="text-muted-foreground hover:text-foreground transition-colors" />
            </PreviewLink>
          </span>
        </div>
        <PreviewRow label="Créé le" value={formatDate(ref.created_at)} />
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
