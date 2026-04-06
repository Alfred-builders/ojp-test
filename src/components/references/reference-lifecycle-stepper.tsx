"use client";

import {
  MagnifyingGlass,
  Timer,
  Signpost,
  CheckCircle,
} from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import type { ReferenceStatus } from "@/types/lot";

interface StepDef {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  description: string;
}

const STEPS: StepDef[] = [
  { label: "Expertise", icon: MagnifyingGlass, description: "Evaluation du bien" },
  { label: "Validation", icon: Timer, description: "Délai / acceptation" },
  { label: "Destination", icon: Signpost, description: "Routage de l'article" },
  { label: "Finalisé", icon: CheckCircle, description: "Clôturé" },
];

const ERROR_STATUSES: ReferenceStatus[] = ["retracte", "devis_refuse", "rendu_client"];

function computeStep(status: ReferenceStatus): number {
  switch (status) {
    case "en_expertise":
    case "expertise_ok":
      return 0;
    case "bloque":
    case "en_retractation":
    case "devis_envoye":
    case "devis_accepte":
    case "devis_refuse":
      return 1;
    case "route_stock":
    case "route_fonderie":
    case "route_depot_vente":
    case "en_depot_vente":
      return 2;
    case "finalise":
    case "vendu":
    case "rendu_client":
    case "retracte":
      return 3;
    default:
      return 0;
  }
}

export function ReferenceLifecycleStepper({
  status,
}: {
  status: ReferenceStatus;
}) {
  const currentStep = computeStep(status);
  const isError = ERROR_STATUSES.includes(status);

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
