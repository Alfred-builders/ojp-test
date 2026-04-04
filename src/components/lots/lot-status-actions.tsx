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
import { Button } from "@/components/ui/button";
import type { LotWithReferences } from "@/types/lot";

interface LotStatusActionsProps {
  lot: LotWithReferences;
}

export function LotStatusActions({ lot }: LotStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function updateLotStatus(updates: Record<string, unknown>) {
    setLoading(true);
    await supabase.from("lots").update(updates).eq("id", lot.id);
    setLoading(false);
    router.refresh();
  }

  async function updateAllReferencesStatus(status: string) {
    await supabase
      .from("lot_references")
      .update({ status })
      .eq("lot_id", lot.id);
  }

  // Brouillon → Enregistrer
  if (lot.status === "brouillon") {
    return (
      <Button
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await supabase.from("lots").update({ updated_at: new Date().toISOString() }).eq("id", lot.id);
          setLoading(false);
          router.push(`/dossiers/${lot.dossier_id}`);
        }}
      >
        <FloppyDisk size={16} weight="duotone" />
        {loading ? "Sauvegarde..." : "Enregistrer"}
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
            const retractEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            await updateAllReferencesStatus("bloque");
            await updateLotStatus({
              status: "en_retractation",
              date_acceptation: now.toISOString(),
              date_fin_retractation: retractEnd.toISOString(),
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

                const { data: stockEntry } = await supabase
                  .from("bijoux_stock")
                  .insert(stockPayload)
                  .select("id")
                  .single();

                if (stockEntry) {
                  await supabase
                    .from("lot_references")
                    .update({
                      status: isDepotVente ? "en_depot_vente" : "route_stock",
                      destination_stock_id: stockEntry.id,
                    })
                    .eq("id", ref.id);
                }
              }

              if (ref.categorie === "or_investissement" && ref.or_investissement_id) {
                // Increment or_investissement quantity
                await supabase.rpc("increment_or_invest_quantite", {
                  p_id: ref.or_investissement_id,
                  p_qty: ref.quantite,
                });

                await supabase
                  .from("lot_references")
                  .update({ status: "route_stock" })
                  .eq("id", ref.id);
              }
            }

            await updateLotStatus({
              status: "finalise",
              date_finalisation: new Date().toISOString(),
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
            await updateAllReferencesStatus("retracte");
            await updateLotStatus({ status: "retracte" });
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
