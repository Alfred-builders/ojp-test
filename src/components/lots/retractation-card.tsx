"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Timer,
  Stamp,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { getSettingClient } from "@/lib/settings-client";
import { triggerEmail } from "@/lib/email/trigger";
import { formatDateTime, formatDate, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateDocument } from "@/lib/pdf/pdf-actions";
import type { ClientInfo, DossierInfo, ReferenceLigne, TotauxInfo } from "@/lib/pdf";
import type { LotWithReferences } from "@/types/lot";

const DEFAULT_RETRACTATION_HEURES = 48;

interface RetractationCardProps {
  lot: LotWithReferences & {
    dossier: {
      id: string;
      numero: string;
      client: {
        id: string;
        civility: string;
        first_name: string;
        last_name: string;
        city?: string | null;
      };
    };
  };
}

export function RetractationCard({ lot }: RetractationCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);
  const [retractationMs, setRetractationMs] = useState(DEFAULT_RETRACTATION_HEURES * 3600_000);

  const supabase = createClient();

  useEffect(() => {
    getSettingClient("business_rules").then((rules) => {
      if (rules) setRetractationMs(rules.retractation_heures * 3600_000);
    });
  }, []);

  const startDate = lot.date_acceptation ? new Date(lot.date_acceptation) : null;
  const endDate = lot.date_fin_retractation ? new Date(lot.date_fin_retractation) : null;

  // Refresh every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!endDate) return null;

  const now = new Date();
  const canFinalize = now >= endDate;
  const isDepotVente = lot.type === "depot_vente";

  // Progress calculation
  const totalDuration = startDate ? endDate.getTime() - startDate.getTime() : retractationMs;
  const elapsed = startDate ? now.getTime() - startDate.getTime() : 0;
  const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);

  // Remaining time
  const diff = endDate.getTime() - now.getTime();
  const hoursLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

  const fmtDateTime = (date: Date) => formatDateTime(date.toISOString());

  async function handleFinaliser() {
    setLoading(true);

    for (const ref of lot.references) {
      if (ref.categorie === "bijoux") {
        const stockPayload: Record<string, unknown> = {
          nom: ref.designation,
          metaux: ref.metal,
          qualite: ref.qualite,
          poids: ref.poids,
          prix_achat: ref.prix_achat,
          prix_revente: ref.prix_revente_estime,
          quantite: ref.quantite,
          statut: isDepotVente ? "en_depot_vente" : "en_stock",
        };

        if (isDepotVente) {
          stockPayload.depot_vente_lot_id = lot.id;
          if (lot.dossier?.client?.id) {
            stockPayload.deposant_client_id = lot.dossier.client.id;
          }
        }

        const { data: stockEntry, error: stockError } = await mutate(
          supabase
            .from("bijoux_stock")
            .insert(stockPayload)
            .select("id")
            .single(),
          "Erreur lors de l'ajout au stock bijoux",
          "Rétractation enregistrée"
        );
        if (stockError) { setLoading(false); return; }

        if (stockEntry) {
          const { error: refError } = await mutate(
            supabase
              .from("lot_references")
              .update({
                status: isDepotVente ? "en_depot_vente" : "route_stock",
                destination_stock_id: stockEntry.id,
              })
              .eq("id", ref.id),
            "Erreur lors de la mise à jour de la référence",
            "Rétractation enregistrée"
          );
          if (refError) { setLoading(false); return; }
        }
      }

      if (ref.categorie === "or_investissement" && ref.or_investissement_id) {
        const { error: rpcError } = await mutate(
          supabase.rpc("increment_or_invest_quantite", {
            p_id: ref.or_investissement_id,
            p_qty: ref.quantite,
          }),
          "Erreur lors de la mise à jour du stock or investissement",
          "Rétractation enregistrée"
        );
        if (rpcError) { setLoading(false); return; }

        const { error: refOrError } = await mutate(
          supabase
            .from("lot_references")
            .update({ status: "route_stock" })
            .eq("id", ref.id),
          "Erreur lors de la mise à jour du statut de la référence",
          "Rétractation enregistrée"
        );
        if (refOrError) { setLoading(false); return; }
      }
    }

    const { error: lotError } = await mutate(
      supabase.from("lots").update({
        status: "finalise",
        date_finalisation: new Date().toISOString(),
      }).eq("id", lot.id),
      "Erreur lors de la finalisation du lot",
      "Rétractation enregistrée"
    );
    if (lotError) { setLoading(false); return; }

    // Generate quittance de rachat for all bijoux references
    if (!isDepotVente) {
      const bijouxRefs = lot.references.filter((r) => r.categorie === "bijoux");
      if (bijouxRefs.length > 0) {
        const now = new Date();
        const client: ClientInfo = {
          civilite: lot.dossier.client.civility === "M" ? "M." : "Mme",
          nom: lot.dossier.client.last_name,
          prenom: lot.dossier.client.first_name,
          ville: lot.dossier.client.city ?? undefined,
        };
        const dossierInfo: DossierInfo = {
          numeroDossier: lot.dossier.numero,
          numeroLot: lot.numero,
          date: formatDate(now.toISOString()),
          heure: formatTime(now),
        };
        const references: ReferenceLigne[] = bijouxRefs.map((ref) => ({
          designation: ref.designation,
          metal: ref.metal ?? "—",
          titrage: ref.qualite ?? "—",
          poids: ref.poids ?? 0,
          quantite: ref.quantite,
          taxe: ref.montant_taxe > 0 ? "11.5%" : "0%",
          prixUnitaire: ref.prix_achat,
          prixTotal: ref.prix_achat * ref.quantite,
        }));
        const totaux: TotauxInfo = {
          totalBrut: lot.total_prix_achat,
          taxe: lot.montant_taxe,
          netAPayer: lot.montant_net,
        };

        await generateDocument({
          type: "quittance_rachat",
          lotId: lot.id,
          dossierId: lot.dossier.id,
          clientId: lot.dossier.client.id,
          client,
          dossier: dossierInfo,
          references,
          totaux,
        });
      }
    }

    triggerEmail({
      notification_type: "contrat_rachat_finalise",
      lot_id: lot.id,
      dossier_id: lot.dossier_id,
    });

    setLoading(false);
    router.refresh();
  }

  async function handleRetractation() {
    setLoading(true);

    const { error: retRefError } = await mutate(
      supabase
        .from("lot_references")
        .update({ status: "retracte" })
        .eq("lot_id", lot.id),
      "Erreur lors de la rétractation des références",
      "Rétractation enregistrée"
    );
    if (retRefError) { setLoading(false); return; }

    const { error: retLotError } = await mutate(
      supabase.from("lots").update({ status: "retracte" }).eq("id", lot.id),
      "Erreur lors de la rétractation du lot",
      "Rétractation enregistrée"
    );
    if (retLotError) { setLoading(false); return; }

    triggerEmail({
      notification_type: "interne_retractation",
      lot_id: lot.id,
      dossier_id: lot.dossier_id,
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Timer size={20} weight="duotone" />
          Délai de rétractation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-amber-200 dark:bg-amber-900/40">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500 dark:bg-amber-400"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {startDate && <span>Début : {fmtDateTime(startDate)}</span>}
            <span>Fin : {fmtDateTime(endDate)}</span>
          </div>
        </div>

        {/* Countdown or expired */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            {canFinalize ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                Délai expiré — le lot peut être finalisé
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">
                {hoursLeft}h {minutesLeft}m restantes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={loading || !canFinalize}
              onClick={handleFinaliser}
            >
              <Stamp size={16} weight="duotone" />
              {loading ? "Traitement..." : "Finaliser le rachat"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={loading}
              onClick={handleRetractation}
            >
              <ArrowCounterClockwise size={16} weight="duotone" />
              Client se rétracte
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
