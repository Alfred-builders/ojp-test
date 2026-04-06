"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  ClipboardText,
  User as PhUser,
  Coins,
  Package,
  CheckCircle,
  Handshake,
  WarningCircle,
  ShoppingCart,
  Truck,
  CurrencyEur,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/dashboard/header";
import { VenteStatusBadge } from "@/components/ventes/vente-status-badge";
import { formatCurrency } from "@/lib/format";
import type { LotWithVenteLignes } from "@/types/lot";
import type { VenteStatus, VenteLigne, FulfillmentStatus } from "@/types/vente";

const FULFILLMENT_CONFIG: Record<FulfillmentStatus, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  servi_stock: { label: "Servi stock", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  a_commander: { label: "À commander", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  commande: { label: "Commandé", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "En magasin", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

interface CommandeDetailPageProps {
  lot: LotWithVenteLignes & {
    dossier: {
      id: string;
      numero: string;
      client: {
        id: string;
        civility: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
      };
    };
  };
  orInvestStock: Record<string, number>;
}

function computeCurrentStep(
  lot: CommandeDetailPageProps["lot"],
  lignes: VenteLigne[],
  allFulfilled: boolean
): number {
  if (lot.status === "termine" || lot.status === "finalise") return 4;
  if (allFulfilled) {
    const allLivre = lignes.every((l) => l.is_livre);
    if (allLivre) return 3;
    return 2;
  }
  // All items are at least "commande" or fulfilled
  const allCommande = lignes.every(
    (l) => l.fulfillment === "commande" || l.fulfillment === "recu" || l.fulfillment === "servi_stock"
  );
  if (allCommande) return 2;
  // All items are at least flagged for ordering (no more pending)
  const allAtLeastACommander = lignes.every(
    (l) => l.fulfillment !== "pending"
  );
  if (allAtLeastACommander) return 1;
  return 0;
}

const STEPS = [
  { label: "À commander", icon: ShoppingCart, description: "En attente de choix fonderie" },
  { label: "Commandé", icon: Truck, description: "Bon de commande envoyé, en attente de livraison" },
  { label: "En magasin", icon: Package, description: "Reçu en boutique, disponible pour le client" },
  { label: "Remis au client", icon: Handshake, description: "Le client a récupéré son or" },
  { label: "Réglé", icon: CurrencyEur, description: "Paiement effectué, commande terminée" },
];

function CommandeStepper({
  lot,
  lignes,
  allFulfilled,
}: {
  lot: CommandeDetailPageProps["lot"];
  lignes: VenteLigne[];
  allFulfilled: boolean;
}) {
  const currentStep = computeCurrentStep(lot, lignes, allFulfilled);

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-4 pb-3 !px-0">
        <div className="flex items-start">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div key={step.label} className="flex flex-1 flex-col items-center relative">
                {/* Connector line */}
                {idx > 0 && (
                  <div
                    className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                      isCompleted || isCurrent ? "bg-foreground/30" : "bg-muted"
                    }`}
                    style={{ zIndex: 0 }}
                  />
                )}

                {/* Icon circle */}
                <div
                  className={`relative z-10 flex size-8 items-center justify-center rounded-full transition-colors ${
                    isCompleted
                      ? "bg-foreground text-primary"
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
                  className={`mt-2 text-xs font-medium text-center ${
                    isCompleted
                      ? "text-foreground"
                      : isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>

                {/* Description */}
                <span className="mt-0.5 text-[10px] text-muted-foreground text-center max-w-[120px]">
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

export function CommandeDetailPage({ lot, orInvestStock }: CommandeDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const clientName = `${lot.dossier.client.civility === "M" ? "M." : "Mme"} ${lot.dossier.client.first_name} ${lot.dossier.client.last_name}`;

  // Only or_investissement lines
  const orInvestLignes = lot.lignes.filter((l) => l.or_investissement_id);
  const bijouxLignes = lot.lignes.filter((l) => l.bijoux_stock_id);

  const completedCount = orInvestLignes.filter(
    (l) => l.fulfillment === "servi_stock" || l.fulfillment === "recu"
  ).length;
  const totalOrInvest = orInvestLignes.length;
  const allFulfilled = totalOrInvest > 0 && completedCount === totalOrInvest;

  async function handleFulfillment(ligneId: string, status: FulfillmentStatus, ligne: VenteLigne) {
    setLoading(true);
    const supabase = createClient();

    const { error } = await mutate(
      supabase
        .from("vente_lignes")
        .update({ fulfillment: status })
        .eq("id", ligneId),
      "Erreur lors de la mise à jour du fulfillment"
    );
    if (error) { setLoading(false); return; }

    // If serving from stock, decrement or_investissement quantity
    if (status === "servi_stock" && ligne.or_investissement_id) {
      const { error: rpcErr } = await mutate(
        supabase.rpc("increment_or_invest_quantite", {
          p_id: ligne.or_investissement_id,
          p_qty: -ligne.quantite,
        }),
        "Erreur lors de la mise à jour du stock"
      );
      if (rpcErr) { setLoading(false); return; }
    }

    // If reverting from servi_stock, re-increment
    if (ligne.fulfillment === "servi_stock" && status !== "servi_stock" && ligne.or_investissement_id) {
      const { error: revertErr } = await mutate(
        supabase.rpc("increment_or_invest_quantite", {
          p_id: ligne.or_investissement_id,
          p_qty: ligne.quantite,
        }),
        "Erreur lors du rétablissement du stock"
      );
      if (revertErr) { setLoading(false); return; }
    }

    // Auto-finalize if all or_invest lines are now fulfilled
    if (status === "servi_stock" || status === "recu") {
      const otherLignes = orInvestLignes.filter((l) => l.id !== ligneId);
      const othersAllFulfilled = otherLignes.every(
        (l) => l.fulfillment === "servi_stock" || l.fulfillment === "recu"
      );
      if (othersAllFulfilled) {
        const { error: finalErr } = await mutate(
          supabase
            .from("lots")
            .update({ status: "finalise", date_finalisation: new Date().toISOString() })
            .eq("id", lot.id),
          "Erreur lors de la finalisation du lot"
        );
        if (finalErr) { setLoading(false); return; }
      }
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <Header
        title={lot.numero}
        backAction={
          <Link href="/commandes">
            <Button variant="ghost" size="icon-sm" aria-label="Retour">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <VenteStatusBadge status={lot.status as VenteStatus} />
      </Header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stepper */}
        {totalOrInvest > 0 && (
          <CommandeStepper lot={lot} lignes={orInvestLignes} allFulfilled={allFulfilled} />
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Info commande */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardText size={20} weight="duotone" />
                Commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Numéro</span>
                <span className="font-medium">{lot.numero}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Dossier</span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  {lot.dossier.numero}
                  <Link href={`/dossiers/${lot.dossier.id}`} target="_blank">
                    <ArrowSquareOut size={14} weight="duotone" className="text-muted-foreground hover:text-foreground transition-colors" />
                  </Link>
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Montant total</span>
                <span className="font-medium">{formatCurrency(lot.total_prix_revente)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhUser size={20} weight="duotone" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Nom</span>
                <span className="font-medium">{clientName}</span>
              </div>
              {lot.dossier.client.phone && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span className="font-medium">{lot.dossier.client.phone}</span>
                </div>
              )}
              {lot.dossier.client.email && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{lot.dossier.client.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Or investissement lines - fulfillment */}
        {orInvestLignes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins size={20} weight="duotone" />
                Or Investissement ({orInvestLignes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {orInvestLignes.map((ligne) => {
                const stockQty = ligne.or_investissement_id
                  ? (orInvestStock[ligne.or_investissement_id] ?? 0)
                  : 0;
                const canServeFromStock = stockQty >= ligne.quantite;
                const fulfillment = FULFILLMENT_CONFIG[ligne.fulfillment];
                const isFulfilled = ligne.fulfillment === "servi_stock" || ligne.fulfillment === "recu";

                return (
                  <div
                    key={ligne.id}
                    className={`rounded-lg border p-4 ${isFulfilled ? "bg-muted/30" : "bg-white dark:bg-card"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Coins size={18} weight="duotone" className="text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{ligne.designation}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {ligne.metal && <span>{ligne.metal}</span>}
                          {ligne.poids && <span>· {ligne.poids}g</span>}
                          <span>· ×{ligne.quantite}</span>
                          <span>· {formatCurrency(ligne.prix_unitaire)}/u</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 mr-2">
                        <p className="text-lg font-bold">{formatCurrency(ligne.prix_total)}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock : {stockQty} dispo
                        </p>
                      </div>

                      <Badge variant="secondary" className={fulfillment.className}>
                        {fulfillment.label}
                      </Badge>
                    </div>

                    {/* Action buttons */}
                    {!isFulfilled && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading || !canServeFromStock}
                          onClick={() => handleFulfillment(ligne.id, "servi_stock", ligne)}
                          title={!canServeFromStock ? `Stock insuffisant (${stockQty} dispo)` : ""}
                        >
                          <Package size={14} weight="duotone" />
                          {canServeFromStock ? "Servir depuis stock" : `Stock insuffisant (${stockQty})`}
                        </Button>
                        {ligne.fulfillment === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => handleFulfillment(ligne.id, "a_commander", ligne)}
                          >
                            <WarningCircle size={14} weight="duotone" />
                            À commander
                          </Button>
                        )}
                        {ligne.fulfillment === "a_commander" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => handleFulfillment(ligne.id, "commande", ligne)}
                          >
                            <ClipboardText size={14} weight="duotone" />
                            Marquer commandé
                          </Button>
                        )}
                        {ligne.fulfillment === "commande" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => handleFulfillment(ligne.id, "recu", ligne)}
                          >
                            <CheckCircle size={14} weight="duotone" />
                            Marquer en magasin
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Bijoux lines (read-only) */}
        {bijouxLignes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package size={20} weight="duotone" />
                Bijoux ({bijouxLignes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bijouxLignes.map((ligne) => (
                <div key={ligne.id} className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{ligne.designation}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {ligne.metal && <span>{ligne.metal}</span>}
                      {ligne.qualite && <span>· {ligne.qualite}</span>}
                      {ligne.poids && <span>· {ligne.poids}g</span>}
                    </div>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(ligne.prix_total)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
