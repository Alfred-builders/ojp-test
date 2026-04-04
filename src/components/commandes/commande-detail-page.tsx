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
  WarningCircle,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
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
import type { LotWithVenteLignes } from "@/types/lot";
import type { VenteStatus, VenteLigne, FulfillmentStatus } from "@/types/vente";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

const FULFILLMENT_CONFIG: Record<FulfillmentStatus, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  servi_stock: { label: "Servi stock", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  a_commander: { label: "À commander", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  commande: { label: "Commandé", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "Reçu", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
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
  const progressPct = totalOrInvest > 0 ? (completedCount / totalOrInvest) * 100 : 0;

  async function handleFulfillment(ligneId: string, status: FulfillmentStatus, ligne: VenteLigne) {
    setLoading(true);
    const supabase = createClient();

    await supabase
      .from("vente_lignes")
      .update({ fulfillment: status })
      .eq("id", ligneId);

    // If serving from stock, decrement or_investissement quantity
    if (status === "servi_stock" && ligne.or_investissement_id) {
      await supabase.rpc("increment_or_invest_quantite", {
        p_id: ligne.or_investissement_id,
        p_qty: -ligne.quantite,
      });
    }

    // If reverting from servi_stock, re-increment
    if (ligne.fulfillment === "servi_stock" && status !== "servi_stock" && ligne.or_investissement_id) {
      await supabase.rpc("increment_or_invest_quantite", {
        p_id: ligne.or_investissement_id,
        p_qty: ligne.quantite,
      });
    }

    setLoading(false);
    router.refresh();
  }

  async function handleCommandePrete() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("lots")
      .update({ status: "finalise", date_finalisation: new Date().toISOString() })
      .eq("id", lot.id);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <Header
        title={lot.numero}
        backAction={
          <Link href="/commandes">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <div className="flex items-center gap-2">
          <VenteStatusBadge status={lot.status as VenteStatus} />
          {allFulfilled && lot.status !== "finalise" && (
            <Button size="sm" disabled={loading} onClick={handleCommandePrete}>
              <CheckCircle size={16} weight="duotone" />
              {loading ? "En cours..." : "Commande prête"}
            </Button>
          )}
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Progress bar */}
        {totalOrInvest > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Progression : {completedCount}/{totalOrInvest} lignes complétées
                </span>
                <span className="text-sm text-muted-foreground">{Math.round(progressPct)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${allFulfilled ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </CardContent>
          </Card>
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
                        {ligne.fulfillment !== "a_commander" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => handleFulfillment(ligne.id, "a_commander", ligne)}
                          >
                            <WarningCircle size={14} weight="duotone" />
                            À commander
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => handleFulfillment(ligne.id, "recu", ligne)}
                          >
                            <CheckCircle size={14} weight="duotone" />
                            Marquer reçu
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
