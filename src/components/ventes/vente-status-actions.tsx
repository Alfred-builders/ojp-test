"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateDocument } from "@/lib/pdf/pdf-actions";
import { triggerEmail } from "@/lib/email/trigger";
import { formatDate, formatTime } from "@/lib/format";
import type { ClientInfo, QuittanceDepotVenteLigne } from "@/lib/pdf/blocks";
import type { LotWithVenteLignes } from "@/types/lot";
import type { VenteStatus, VenteLigne } from "@/types/vente";
import type { Reglement } from "@/types/reglement";

interface VenteStatusActionsProps {
  lot: LotWithVenteLignes & {
    dossier: {
      id: string;
      numero: string;
      client: {
        id: string;
        civility: string;
        first_name: string;
        last_name: string;
      };
    };
  };
  reglements?: Reglement[];
  /** Render only specific actions: "terminer" or "annuler". Default renders all. */
  mode?: "terminer" | "annuler";
}

export function VenteStatusActions({ lot, reglements = [], mode }: VenteStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showTerminer, setShowTerminer] = useState(false);
  const [showAnnuler, setShowAnnuler] = useState(false);

  const supabase = createClient();
  const status = lot.status as VenteStatus;

  const bijouxLignes = lot.lignes.filter((l) => !!l.bijoux_stock_id);
  const allLivrees = lot.lignes.length > 0 && lot.lignes.every((l) => l.is_livre);

  // ── Helpers ────────────────────────────────────────────────

  function nowFormatted() {
    const now = new Date();
    const dateStr = formatDate(now.toISOString());
    const heureStr = formatTime(now);
    return { dateStr, heureStr, now };
  }

  // ── Terminer (with mode reglement) ─────────────────────────

  async function handleTerminer() {
    setLoading(true);

    try {
    const { dateStr, heureStr } = nowFormatted();

    // Get mode_reglement from the latest reglement record
    const lastReglement = reglements.filter((r) => r.type !== "fonderie").at(-1);
    const modeReglement = lastReglement?.mode ?? "especes";

    // Phase 1: Mark bijoux stock items as vendu + collect depot-vente items
    const dvItemsByLot = new Map<string, Array<{ ligne: VenteLigne; stockId: string }>>();

    for (const ligne of bijouxLignes) {
      if (ligne.bijoux_stock_id) {
        const { data: stockItem } = await supabase
          .from("bijoux_stock")
          .select("depot_vente_lot_id")
          .eq("id", ligne.bijoux_stock_id)
          .single();

        const { error: errStock } = await mutate(
          supabase
            .from("bijoux_stock")
            .update({ statut: "vendu" })
            .eq("id", ligne.bijoux_stock_id),
          "Erreur lors du passage en vendu du bijou",
          "Statut mis à jour"
        );
        if (errStock) return;

        if (stockItem?.depot_vente_lot_id) {
          const { error: errRef } = await mutate(
            supabase
              .from("lot_references")
              .update({ status: "vendu" })
              .eq("destination_stock_id", ligne.bijoux_stock_id),
            "Erreur lors de la mise à jour de la référence dépôt-vente",
            "Statut mis à jour"
          );
          if (errRef) return;

          const existing = dvItemsByLot.get(stockItem.depot_vente_lot_id) ?? [];
          existing.push({ ligne, stockId: ligne.bijoux_stock_id });
          dvItemsByLot.set(stockItem.depot_vente_lot_id, existing);
        }
      }
    }

    // Phase 2: Generate quittances DV (BEFORE factures)
    for (const [dvLotId, items] of dvItemsByLot.entries()) {
      const { data: dvLot } = await supabase
        .from("lots")
        .select("id, numero, dossier_id, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name, address, postal_code, city))")
        .eq("id", dvLotId)
        .single();

      if (!dvLot?.dossier) continue;

      const dvDossier = dvLot.dossier as unknown as { id: string; numero: string; client: { id: string; civility: string; first_name: string; last_name: string; address: string | null; postal_code: string | null; city: string | null } };
      const deposant = dvDossier.client;

      const { data: idDoc } = await supabase
        .from("client_identity_documents")
        .select("document_type, document_number")
        .eq("client_id", deposant.id)
        .eq("is_primary", true)
        .single();

      const stockIds = items.map((i) => i.stockId);
      const { data: lotRefs } = await supabase
        .from("lot_references")
        .select("destination_stock_id, prix_achat, designation")
        .in("destination_stock_id", stockIds);

      const refByStockId = new Map(
        (lotRefs ?? []).map((r) => [r.destination_stock_id, r])
      );

      const lignesQdv: QuittanceDepotVenteLigne[] = [];
      let totalVentes = 0;
      let totalCommission = 0;
      let totalNetDeposant = 0;

      for (const { ligne, stockId } of items) {
        const ref = refByStockId.get(stockId);
        const prixVente = ligne.prix_total;
        const netDeposant = ref?.prix_achat ?? prixVente * 0.6;
        const commission = prixVente - netDeposant;

        lignesQdv.push({
          designation: ref?.designation ?? ligne.designation,
          description: ligne.designation,
          prixVentePublic: prixVente,
          netDeposant,
          commission,
        });

        totalVentes += prixVente;
        totalCommission += commission;
        totalNetDeposant += netDeposant;
      }

      const clientInfo: ClientInfo = {
        civilite: deposant.civility === "M" ? "M." : "Mme",
        nom: deposant.last_name,
        prenom: deposant.first_name,
        adresse: deposant.address ?? undefined,
        codePostal: deposant.postal_code ?? undefined,
        ville: deposant.city ?? undefined,
        documentType: idDoc?.document_type ?? undefined,
        documentNumber: idDoc?.document_number ?? undefined,
      };

      const qdvPath = await generateDocument({
        type: "quittance_depot_vente",
        lotId: dvLot.id,
        dossierId: dvDossier.id,
        clientId: deposant.id,
        client: clientInfo,
        dossier: { numeroDossier: dvDossier.numero, numeroLot: dvLot.numero, date: dateStr, heure: heureStr },
        references: [],
        totaux: { totalBrut: totalVentes, taxe: totalCommission, netAPayer: totalNetDeposant },
        quittanceDepotVenteLignes: lignesQdv,
        totalVentes,
        totalCommission,
        venteDossierNumero: lot.dossier.numero,
      });
      if (qdvPath) {
        triggerEmail({
          notification_type: "quittance_depot_vente",
          lot_id: dvLot.id,
          dossier_id: dvDossier.id,
          client_id: deposant.id,
          attachment_paths: [qdvPath],
          extra_variables: {
            montant_net: formatCurrency(totalNetDeposant),
            montant_commission: formatCurrency(totalCommission),
          },
        });
      }
    }

    // Phase 3: Update lot status (factures are generated at "passer en cours")
    const { error: errLot } = await mutate(
      supabase.from("lots").update({
        status: "termine",
        mode_reglement: modeReglement,
        date_reglement: new Date().toISOString(),
        solde_paye: true,
        date_solde: new Date().toISOString(),
      }).eq("id", lot.id),
      "Erreur lors de la finalisation du lot de vente",
      "Vente finalisée"
    );
    if (errLot) return;

    setShowTerminer(false);
    router.refresh();
    } catch (err) {
      console.error("Erreur lors de la finalisation de la vente:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Annuler ────────────────────────────────────────────────

  async function handleAnnuler() {
    setLoading(true);

    try {
    for (const ligne of lot.lignes) {
      if (ligne.bijoux_stock_id) {
        const { data: stockItem } = await supabase
          .from("bijoux_stock")
          .select("depot_vente_lot_id")
          .eq("id", ligne.bijoux_stock_id)
          .single();

        const revertStatus = stockItem?.depot_vente_lot_id ? "en_depot_vente" : "en_stock";
        const { error: errRevert } = await mutate(
          supabase
            .from("bijoux_stock")
            .update({ statut: revertStatus })
            .eq("id", ligne.bijoux_stock_id),
          "Erreur lors de la remise en stock du bijou",
          "Statut mis à jour"
        );
        if (errRevert) break;
      }
    }

    const { error: errAnnule } = await mutate(
      supabase.from("lots").update({ status: "annule" }).eq("id", lot.id),
      "Erreur lors de l'annulation du lot de vente",
      "Vente annulée"
    );
    if (errAnnule) return;

    setShowAnnuler(false);
    router.refresh();
    } catch (err) {
      console.error("Erreur lors de l'annulation de la vente:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────

  // Brouillon — header "Enregistrer" is now handled by the parent page
  if (status === "brouillon") {
    return null;
  }

  // En cours → Terminer (quand tout est livré) / Annuler
  if (status === "en_cours") {
    // Mode "terminer" — card-style CTA when all items are delivered
    if (mode === "terminer") {
      if (!allLivrees) return null;
      return (
        <>
          <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle size={18} weight="duotone" />
                Tous les articles sont livrés
              </div>
              <Button size="sm" disabled={loading} onClick={() => setShowTerminer(true)}>
                <CheckCircle size={16} weight="duotone" />
                Terminer la vente
              </Button>
            </CardContent>
          </Card>

          <Dialog open={showTerminer} onOpenChange={setShowTerminer}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Terminer la vente</DialogTitle>
                <DialogDescription>
                  Les factures seront générées et la vente sera finalisée. Les règlements doivent être enregistrés dans la carte Règlements.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowTerminer(false)}>
                  Annuler
                </Button>
                <Button
                  size="sm"
                  disabled={loading}
                  onClick={handleTerminer}
                >
                  <CheckCircle size={14} weight="duotone" />
                  {loading ? "En cours..." : "Confirmer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    // Mode "annuler" — small destructive button
    if (mode === "annuler") {
      return (
        <>
          <button
            className="text-sm text-destructive hover:underline disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            disabled={loading}
            onClick={() => setShowAnnuler(true)}
          >
            <XCircle size={16} weight="duotone" />
            Annuler la vente
          </button>

          <Dialog open={showAnnuler} onOpenChange={setShowAnnuler}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Annuler la vente</DialogTitle>
                <DialogDescription>
                  Les bijoux seront remis en stock. Cette action est irréversible.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowAnnuler(false)}>
                  Non, garder
                </Button>
                <Button variant="destructive" size="sm" disabled={loading} onClick={handleAnnuler}>
                  <XCircle size={14} weight="duotone" />
                  {loading ? "Annulation..." : "Oui, annuler"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    // Default mode (no mode specified) — render both
    return (
      <div className="flex items-center gap-2">
        {allLivrees && (
          <Button size="sm" disabled={loading} onClick={() => setShowTerminer(true)}>
            <CheckCircle size={16} weight="duotone" />
            Terminer la vente
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={() => setShowAnnuler(true)}
        >
          <XCircle size={16} weight="duotone" />
          Annuler
        </Button>

        <Dialog open={showTerminer} onOpenChange={setShowTerminer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Terminer la vente</DialogTitle>
              <DialogDescription>
                Les factures seront générées et la vente sera finalisée. Les règlements doivent être enregistrés dans la carte Règlements.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowTerminer(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                disabled={loading}
                onClick={handleTerminer}
              >
                <CheckCircle size={14} weight="duotone" />
                {loading ? "En cours..." : "Confirmer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAnnuler} onOpenChange={setShowAnnuler}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Annuler la vente</DialogTitle>
              <DialogDescription>
                Les bijoux seront remis en stock. Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowAnnuler(false)}>
                Non, garder
              </Button>
              <Button variant="destructive" size="sm" disabled={loading} onClick={handleAnnuler}>
                <XCircle size={14} weight="duotone" />
                {loading ? "Annulation..." : "Oui, annuler"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
