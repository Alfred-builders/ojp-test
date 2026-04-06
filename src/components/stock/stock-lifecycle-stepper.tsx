"use client";

import {
  Package,
  Diamond,
  Storefront,
  CheckCircle,
} from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import type { BijouxStock } from "@/types/bijoux";

interface StepDef {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  description: string;
}

const STEPS: StepDef[] = [
  { label: "Entrée", icon: Package, description: "Rachat ou dépôt-vente" },
  { label: "En stock", icon: Diamond, description: "Disponible en boutique" },
  { label: "Sortie", icon: Storefront, description: "Vendu ou rendu" },
];

function computeStep(statut: BijouxStock["statut"]): number {
  switch (statut) {
    case "en_stock":
    case "reserve":
    case "en_depot_vente":
    case "en_reparation":
      return 1;
    case "vendu":
    case "rendu_client":
      return 2;
    default:
      return 0;
  }
}

export function StockLifecycleStepper({
  statut,
}: {
  statut: BijouxStock["statut"];
}) {
  const currentStep = computeStep(statut);
  const isError = statut === "rendu_client";

  return (
    <Card className="overflow-hidden">
      <CardContent className="!px-0 pb-3 pt-4">
        <div className="flex items-start">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            const isErrorState = isError && isCurrent;

            return (
              <div
                key={step.label}
                className="relative flex flex-1 flex-col items-center"
              >
                {/* Connector line */}
                {idx > 0 && (
                  <div
                    className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                      isCompleted || isCurrent
                        ? "bg-foreground/30"
                        : "bg-muted"
                    }`}
                    style={{ zIndex: 0 }}
                  />
                )}

                {/* Icon circle */}
                <div
                  className={`relative z-10 flex size-8 items-center justify-center rounded-full transition-colors ${
                    isErrorState
                      ? "bg-amber-500/10 text-amber-600 ring-4 ring-amber-500/20"
                      : isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle size={16} weight="bold" />
                  ) : (
                    <Icon
                      size={16}
                      weight={isCurrent ? "fill" : "duotone"}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`mt-2 text-center text-xs font-medium ${
                    isErrorState
                      ? "text-amber-600"
                      : isCompleted || isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>

                {/* Description */}
                <span className="mt-0.5 max-w-[120px] text-center text-[10px] text-muted-foreground">
                  {step.description}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
