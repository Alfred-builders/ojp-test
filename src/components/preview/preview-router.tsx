"use client";

import { lazy, Suspense } from "react";
import { PreviewSkeleton } from "@/components/preview/preview-skeleton";

export type EntityType =
  | "client"
  | "dossier"
  | "lot"
  | "vente"
  | "fonderie"
  | "stock";

export const entityLabels: Record<EntityType, string> = {
  client: "Client",
  dossier: "Dossier",
  lot: "Lot",
  vente: "Vente",
  fonderie: "Fonderie",
  stock: "Stock",
};

export const entityRoutes: Record<EntityType, string> = {
  client: "clients",
  dossier: "dossiers",
  lot: "lots",
  vente: "ventes",
  fonderie: "fonderies",
  stock: "stock",
};

const ClientPreview = lazy(() => import("@/components/preview/client-preview"));
const DossierPreview = lazy(
  () => import("@/components/preview/dossier-preview")
);
const LotPreview = lazy(() => import("@/components/preview/lot-preview"));

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
