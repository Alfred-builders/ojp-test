"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  CheckCircle,
  XCircle,
  Timer,
  Stamp,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { getSettingClient } from "@/lib/settings-client";
import { triggerEmail } from "@/lib/email/trigger";
import { Button } from "@/components/ui/button";
import type { LotWithReferences } from "@/types/lot";

const DEFAULT_RETRACTATION_HEURES = 48;

interface LotStatusActionsProps {
  lot: LotWithReferences;
}

export function LotStatusActions({ lot }: LotStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [retractationMs, setRetractationMs] = useState(DEFAULT_RETRACTATION_HEURES * 3600_000);

  useEffect(() => {
    getSettingClient("business_rules").then((rules) => {
      if (rules) setRetractationMs(rules.retractation_heures * 3600_000);
    });
  }, []);

  const supabase = createClient();

  async function updateLotStatus(updates: Record<string, unknown>) {
    setLoading(true);
    const { error } = await mutate(
      supabase.from("lots").update(updates).eq("id", lot.id),
      "Erreur lors de la mise à jour du statut du lot",
      "Statut du lot mis à jour"
    );
    setLoading(false);
    if (error) return;
    router.refresh();
  }

  async function updateAllReferencesStatus(status: string) {
    const { error } = await mutate(
      supabase.from("lot_references").update({ status }).eq("lot_id", lot.id),
      "Erreur lors de la mise à jour des références",
      "Statut du lot mis à jour"
    );
    return { error };
  }

  // Brouillon → Enregistrer
  if (lot.status === "brouillon") {
    return (
      <Button
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const { error } = await mutate(
            supabase.from("lots").update({ updated_at: new Date().toISOString() }).eq("id", lot.id),
            "Erreur lors de l'enregistrement du lot",
            "Statut du lot mis à jour"
          );
          setLoading(false);
          if (error) return;
          router.push(`/dossiers/${lot.dossier_id}`);
        }}
      >
        <FloppyDisk size={16} weight="duotone" />
        {loading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    );
  }

  // Devis envoyé → Accepté / Refusé
  if (lot.status === "devis_envoye") {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const now = new Date();
            const retractEnd = new Date(now.getTime() + retractationMs);
            const { error } = await updateAllReferencesStatus("bloque");
            if (error) { setLoading(false); return; }
            await updateLotStatus({
              status: "en_retractation",
              date_acceptation: now.toISOString(),
              date_fin_retractation: retractEnd.toISOString(),
            });
            triggerEmail({
              notification_type: "interne_devis_accepte",
              lot_id: lot.id,
              dossier_id: lot.dossier_id,
            });
          }}
        >
          <CheckCircle size={16} weight="duotone" />
          Accepté
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={() => updateLotStatus({ status: "refuse" })}
        >
          <XCircle size={16} weight="duotone" />
          Refusé
        </Button>
      </div>
    );
  }

  // En rétractation → Finaliser / Rétracté
  if (lot.status === "en_retractation") {
    const now = new Date();
    const retractEnd = lot.date_fin_retractation ? new Date(lot.date_fin_retractation) : null;
    const canFinalize = retractEnd && now >= retractEnd;
    const isDepotVente = lot.type === "depot_vente";

    return (
      <div className="flex items-center gap-2">
        {retractEnd && !canFinalize && (
          <RetractCountdown endDate={retractEnd} />
        )}
        <Button
          size="sm"
          disabled={loading || !canFinalize}
          onClick={async () => {
            setLoading(true);

            let hasError = false;
            for (const ref of lot.references) {
              if (ref.categorie === "bijoux") {
                // Create stock entry for bijoux
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

                // Add depot-vente traceability
                if (isDepotVente) {
                  stockPayload.depot_vente_lot_id = lot.id;
                  // Access client id from lot's dossier (passed as extra prop)
                  const dossier = (lot as unknown as { dossier?: { client?: { id: string } } }).dossier;
                  if (dossier?.client?.id) {
                    stockPayload.deposant_client_id = dossier.client.id;
                  }
                }

                const { data: stockEntry, error: stockError } = await mutate(
                  supabase
                    .from("bijoux_stock")
                    .insert(stockPayload)
                    .select("id")
                    .single(),
                  "Erreur lors de la création de l'entrée stock bijoux",
                  "Statut du lot mis à jour"
                );
                if (stockError) { hasError = true; break; }

                if (stockEntry) {
                  const { error: refError } = await mutate(
                    supabase
                      .from("lot_references")
                      .update({
                        status: isDepotVente ? "en_depot_vente" : "route_stock",
                        destination_stock_id: stockEntry.id,
                      })
                      .eq("id", ref.id),
                    "Erreur lors de la mise à jour de la référence vers le stock",
                    "Statut du lot mis à jour"
                  );
                  if (refError) { hasError = true; break; }
                }
              }

              if (ref.categorie === "or_investissement" && ref.or_investissement_id) {
                // Increment or_investissement quantity
                const { error: rpcError } = await mutate(
                  supabase.rpc("increment_or_invest_quantite", {
                    p_id: ref.or_investissement_id,
                    p_qty: ref.quantite,
                  }),
                  "Erreur lors de l'incrémentation du stock or investissement",
                  "Statut du lot mis à jour"
                );
                if (rpcError) { hasError = true; break; }

                const { error: refError } = await mutate(
                  supabase
                    .from("lot_references")
                    .update({ status: "route_stock" })
                    .eq("id", ref.id),
                  "Erreur lors de la mise à jour du statut de la référence",
                  "Statut du lot mis à jour"
                );
                if (refError) { hasError = true; break; }
              }
            }

            if (hasError) { setLoading(false); return; }

            await updateLotStatus({
              status: "finalise",
              date_finalisation: new Date().toISOString(),
            });
            // Notify: rachat finalized (PDFs already generated at dossier finalization)
            triggerEmail({
              notification_type: "contrat_rachat_finalise",
              lot_id: lot.id,
              dossier_id: lot.dossier_id,
            });
          }}
        >
          <Stamp size={16} weight="duotone" />
          Finaliser
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const { error } = await updateAllReferencesStatus("retracte");
            if (error) { setLoading(false); return; }
            await updateLotStatus({ status: "retracte" });
            triggerEmail({
              notification_type: "interne_retractation",
              lot_id: lot.id,
              dossier_id: lot.dossier_id,
            });
          }}
        >
          <ArrowCounterClockwise size={16} weight="duotone" />
          Client se rétracte
        </Button>
      </div>
    );
  }

  return null;
}

function RetractCountdown({ endDate }: { endDate: Date }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex items-center gap-1.5 text-sm text-amber-600">
      <Timer size={16} weight="duotone" />
      <span>{hours}h {minutes}m restantes</span>
    </div>
  );
}
