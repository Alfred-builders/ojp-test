"use client";

import { lazy, Suspense } from "react";
import { PreviewSkeleton } from "@/components/preview/preview-skeleton";

export type EntityType =
  | "client"
  | "dossier"
  | "lot"
  | "vente"
  | "reference"
  | "fonderie"
  | "stock";

export const entityLabels: Record<EntityType, string> = {
  client: "Client",
  dossier: "Dossier",
  lot: "Lot",
  vente: "Vente",
  reference: "Référence",
  fonderie: "Fonderie",
  stock: "Stock",
};

export const entityRoutes: Record<EntityType, string> = {
  client: "clients",
  dossier: "dossiers",
  lot: "lots",
  vente: "ventes",
  reference: "references",
  fonderie: "fonderies",
  stock: "stock",
};

const ClientPreview = lazy(() => import("@/components/preview/client-preview"));
const DossierPreview = lazy(
  () => import("@/components/preview/dossier-preview")
);
const LotPreview = lazy(() => import("@/components/preview/lot-preview"));
const ReferencePreview = lazy(
  () => import("@/components/preview/reference-preview")
);

interface PreviewRouterProps {
  type: EntityType;
  id: string;
}

export function PreviewRouter({ type, id }: PreviewRouterProps) {
  return (
    <Suspense fallback={<PreviewSkeleton />}>
      {type === "client" && <ClientPreview id={id} />}
      {type === "dossier" && <DossierPreview id={id} />}
      {type === "lot" && <LotPreview id={id} />}
      {type === "reference" && <ReferencePreview id={id} />}
      {type === "vente" && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aperçu vente — bientôt disponible
        </p>
      )}
      {type === "fonderie" && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aperçu fonderie — bientôt disponible
        </p>
      )}
      {type === "stock" && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aperçu stock — bientôt disponible
        </p>
      )}
    </Suspense>
  );
}
