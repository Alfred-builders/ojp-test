"use client";

import {
  FileText,
  Timer,
  CheckCircle,
  Stamp,
  Truck,
  Package,
  CurrencyEur,
  Storefront,
  Handshake,
  PencilSimple,
  Diamond,
} from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

// ── Types ──────────────────────────────────────────────

interface StepDef {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  description: string;
}

interface LotStepperProps {
  lotType: "rachat" | "vente" | "depot_vente";
  lotStatus: string;
  hasDevis?: boolean;
  hasOrInvest?: boolean;
  worstFulfillment?: string;
  allLivre?: boolean;
  allRefsTerminal?: boolean;
  isError?: boolean;
  /** Reference statuses for rachat — used to determine actual step when lot status is en_cours */
  referenceStatuses?: string[];
}

// ── Step definitions per lot type ──────────────────────

const RACHAT_DIRECT_STEPS: StepDef[] = [
  { label: "Brouillon", icon: PencilSimple, description: "Ajout des références" },
  { label: "Validé", icon: Stamp, description: "Contrat généré" },
  { label: "Rétractation", icon: Timer, description: "Délai de 48h" },
  { label: "Finalisé", icon: CheckCircle, description: "Stock créé" },
];

const RACHAT_DEVIS_STEPS: StepDef[] = [
  { label: "Brouillon", icon: PencilSimple, description: "Ajout des références" },
  { label: "Devis envoyé", icon: FileText, description: "En attente du client" },
  { label: "Accepté", icon: CheckCircle, description: "Client a accepté" },
  { label: "Rétractation", icon: Timer, description: "Délai de 48h" },
  { label: "Finalisé", icon: Stamp, description: "Stock créé" },
];

const DEPOT_VENTE_STEPS: StepDef[] = [
  { label: "Brouillon", icon: PencilSimple, description: "Ajout des articles" },
  { label: "Validé", icon: Stamp, description: "Contrats générés" },
  { label: "En dépôt", icon: Diamond, description: "Articles en boutique" },
  { label: "Terminé", icon: CheckCircle, description: "Vendu ou rendu" },
];

const VENTE_BIJOUX_STEPS: StepDef[] = [
  { label: "Brouillon", icon: PencilSimple, description: "Sélection des articles" },
  { label: "En cours", icon: Storefront, description: "Facture générée" },
  { label: "Livré", icon: Handshake, description: "Articles remis" },
  { label: "Réglé", icon: CurrencyEur, description: "Paiement effectué" },
];

const VENTE_OR_INVEST_STEPS: StepDef[] = [
  { label: "Brouillon", icon: PencilSimple, description: "Sélection des articles" },
  { label: "En cours", icon: Storefront, description: "Acompte 10%" },
  { label: "Commandé", icon: Truck, description: "Commande fournisseur" },
  { label: "Reçu", icon: Package, description: "Articles reçus" },
  { label: "Livré", icon: Handshake, description: "Articles remis" },
  { label: "Réglé", icon: CurrencyEur, description: "Solde payé" },
];

// ── Compute current step ──────────────────────────────

function computeRachatStep(status: string, hasDevis: boolean, refStatuses: string[]): number {
  // Check if any reference is in retractation
  const hasRetractation = refStatuses.some((s) => s === "en_retractation" || s === "bloque");
  const hasDevisEnvoye = refStatuses.some((s) => s === "devis_envoye");

  if (hasDevis) {
    if (status === "brouillon") return 0;
    if (status === "finalise") return 4;
    if (status === "retracte" || status === "refuse") return 4;
    if (hasRetractation) return 3;
    if (hasDevisEnvoye) return 1;
    // accepte or en_cours with devis accepted
    return 2;
  }
  if (status === "brouillon") return 0;
  if (status === "finalise") return 3;
  if (status === "retracte") return 3;
  if (hasRetractation) return 2;
  if (status === "en_retractation") return 2;
  return 1;
}

function computeVenteStep(
  status: string,
  hasOrInvest: boolean,
  worstFulfillment: string,
  allLivre: boolean
): number {
  if (hasOrInvest) {
    if (status === "brouillon") return 0;
    if (status === "termine") return 5;
    if (status === "annule") return 5;
    if (allLivre) return 4;
    switch (worstFulfillment) {
      case "recu":
      case "servi_stock":
        return 3;
      case "commande":
        return 2;
      case "a_commander":
      case "pending":
      default:
        return 1;
    }
  }
  if (status === "brouillon") return 0;
  if (status === "termine") return 3;
  if (status === "annule") return 3;
  if (allLivre) return 2;
  return 1;
}

function computeDepotVenteStep(status: string, allRefsTerminal: boolean): number {
  if (status === "brouillon") return 0;
  if (allRefsTerminal) return 3;
  if (status === "finalise") return 2;
  return 1;
}

// ── Stepper component ─────────────────────────────────

export function LotStepper({
  lotType,
  lotStatus,
  hasDevis = false,
  hasOrInvest = false,
  worstFulfillment = "pending",
  allLivre = false,
  allRefsTerminal = false,
  isError = false,
  referenceStatuses = [],
}: LotStepperProps) {
  let steps: StepDef[];
  let currentStep: number;

  switch (lotType) {
    case "rachat":
      steps = hasDevis ? RACHAT_DEVIS_STEPS : RACHAT_DIRECT_STEPS;
      currentStep = computeRachatStep(lotStatus, hasDevis, referenceStatuses);
      break;
    case "vente":
      steps = hasOrInvest ? VENTE_OR_INVEST_STEPS : VENTE_BIJOUX_STEPS;
      currentStep = computeVenteStep(lotStatus, hasOrInvest, worstFulfillment, allLivre);
      break;
    case "depot_vente":
      steps = DEPOT_VENTE_STEPS;
      currentStep = computeDepotVenteStep(lotStatus, allRefsTerminal);
      break;
    default:
      return null;
  }

  // Don't show stepper in brouillon
  if (lotStatus === "brouillon") return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="!px-0 pb-3 pt-4">
        <div className="flex items-start">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            const isErrorState = isError && isCurrent;

            return (
              <div key={step.label} className="relative flex flex-1 flex-col items-center">
                {/* Connector line */}
                {idx > 0 && (
                  <div
                    className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                      isCompleted || isCurrent ? "bg-foreground/30" : "bg-muted"
                    }`}
                    style={{ zIndex: 0 }}
                  />
                )}

                {/* Icon circle */}
                <div
                  className={`relative z-10 flex size-8 items-center justify-center rounded-full transition-colors ${
                    isErrorState
                      ? "bg-destructive/10 text-destructive ring-4 ring-destructive/20"
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
                    <Icon size={16} weight={isCurrent ? "fill" : "duotone"} />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`mt-2 text-center text-xs font-medium ${
                    isErrorState
                      ? "text-destructive"
                      : isCompleted || isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>

                {/* Description — always visible */}
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
