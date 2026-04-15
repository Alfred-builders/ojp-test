"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HandCoins,
  Diamond,
  CheckCircle,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { executeAction } from "@/lib/actions/action-executor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import type { LotWithReferences, LotReference } from "@/types/lot";
import type { ActionContext } from "@/lib/actions/action-types";
import type { DossierClient } from "@/types/dossier";

interface RestitutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: LotWithReferences;
  dossierClient: DossierClient;
}

export function RestitutionDialog({ open, onOpenChange, lot, dossierClient }: RestitutionDialogProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [restituted, setRestituted] = useState<Set<string>>(new Set());

  const enDepotVente = lot.references.filter(
    (r) => r.status === "en_depot_vente" && !restituted.has(r.id)
  );
  const alreadyRestituted = lot.references.filter(
    (r) => r.status === "rendu_client" || restituted.has(r.id)
  );

  const ctx: ActionContext = {
    lot,
    dossier: {
      id: lot.dossier_id,
      numero: lot.numero,
      client: {
        id: dossierClient.id,
        civility: dossierClient.civility,
        first_name: dossierClient.first_name,
        last_name: dossierClient.last_name,
        city: dossierClient.city,
      },
    },
    retractationMs: 0,
  };

  async function handleRestituer(ref: LotReference) {
    setLoadingId(ref.id);
    const supabase = createClient();
    const result = await executeAction({
      actionId: "ref.restituer",
      supabase,
      ctx,
      referenceId: ref.id,
    });
    setLoadingId(null);
    if (result.success) {
      setRestituted((prev) => new Set(prev).add(ref.id));
    }
  }

  function handleClose() {
    onOpenChange(false);
    if (restituted.size > 0) {
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[calc(100vw-4rem)] h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins size={20} weight="duotone" />
            Restituer des articles — {lot.numero}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les articles à restituer au client.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {/* Articles en depot-vente */}
          {enDepotVente.length > 0 ? (
            enDepotVente.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Diamond size={18} weight="duotone" className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ref.designation}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {ref.metal && <span>{ref.metal}</span>}
                    {ref.qualite && <span>· {ref.qualite}</span>}
                    {(ref.poids_net ?? ref.poids) && <span>· {ref.poids_net ?? ref.poids}g</span>}
                    <span>· x{ref.quantite}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatCurrency(ref.prix_achat * ref.quantite)} <span className="text-xs font-normal text-muted-foreground">net déposant</span></p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loadingId === ref.id}
                  onClick={() => handleRestituer(ref)}
                >
                  <HandCoins size={14} weight="duotone" />
                  {loadingId === ref.id ? "Restitution..." : "Restituer"}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Tous les articles ont été restitués.
            </p>
          )}

          {/* Articles deja restitues */}
          {alreadyRestituted.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-2">Déjà restitués</p>
              {alreadyRestituted.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center gap-4 rounded-lg border border-dashed p-4 opacity-60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <CheckCircle size={18} weight="duotone" className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{ref.designation}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {ref.metal && <span>{ref.metal}</span>}
                      {ref.qualite && <span>· {ref.qualite}</span>}
                      {(ref.poids_net ?? ref.poids) && <span>· {ref.poids_net ?? ref.poids}g</span>}
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Restitué
                  </Badge>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
