"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  Truck,
  CurrencyEur,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { MODE_REGLEMENT_OPTIONS } from "@/lib/validations/vente";
import type { LotWithVenteLignes } from "@/types/lot";
import type { ModeReglement, VenteStatus } from "@/types/vente";

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
}

export function VenteStatusActions({ lot }: VenteStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReglement, setShowReglement] = useState(false);
  const [modeReglement, setModeReglement] = useState<ModeReglement | "">("");
  const [showAnnuler, setShowAnnuler] = useState(false);

  const supabase = createClient();
  const status = lot.status as VenteStatus;

  async function updateStatus(updates: Record<string, unknown>) {
    setLoading(true);
    await supabase.from("lots").update(updates).eq("id", lot.id);
    setLoading(false);
    router.refresh();
  }

  async function handlePasserEnCours() {
    if (lot.lignes.length === 0) return;
    await updateStatus({ status: "en_cours" });
  }

  async function handleMarquerLivre() {
    await updateStatus({
      status: "livre",
      date_livraison: new Date().toISOString(),
    });
  }

  async function handlePasserARegler() {
    setLoading(true);
    // Create facture
    await supabase.from("factures").insert({
      lot_id: lot.id,
      client_id: lot.dossier.client.id,
      montant_ht: lot.total_prix_revente,
      montant_taxe: lot.montant_taxe,
      montant_ttc: lot.total_prix_revente + lot.montant_taxe,
    });

    await supabase.from("lots").update({
      status: "a_regler",
    }).eq("id", lot.id);

    setLoading(false);
    router.refresh();
  }

  async function handleTerminer() {
    if (!modeReglement) return;
    setLoading(true);

    // Mark all stock items as vendu
    for (const ligne of lot.lignes) {
      if (ligne.bijoux_stock_id) {
        // Check if this is a depot-vente item
        const { data: stockItem } = await supabase
          .from("bijoux_stock")
          .select("depot_vente_lot_id")
          .eq("id", ligne.bijoux_stock_id)
          .single();

        await supabase
          .from("bijoux_stock")
          .update({ statut: "vendu" })
          .eq("id", ligne.bijoux_stock_id);

        // If depot-vente item, also mark the original lot_reference as vendu
        if (stockItem?.depot_vente_lot_id) {
          await supabase
            .from("lot_references")
            .update({ status: "vendu" })
            .eq("destination_stock_id", ligne.bijoux_stock_id);
        }
      }
    }

    await supabase.from("lots").update({
      status: "termine",
      mode_reglement: modeReglement,
      date_reglement: new Date().toISOString(),
    }).eq("id", lot.id);

    setShowReglement(false);
    setLoading(false);
    router.refresh();
  }

  async function handleAnnuler() {
    setLoading(true);

    // Revert stock items to their original status
    for (const ligne of lot.lignes) {
      if (ligne.bijoux_stock_id) {
        const { data: stockItem } = await supabase
          .from("bijoux_stock")
          .select("depot_vente_lot_id")
          .eq("id", ligne.bijoux_stock_id)
          .single();

        const revertStatus = stockItem?.depot_vente_lot_id ? "en_depot_vente" : "en_stock";
        await supabase
          .from("bijoux_stock")
          .update({ statut: revertStatus })
          .eq("id", ligne.bijoux_stock_id);
      }
    }

    await supabase.from("lots").update({ status: "annule" }).eq("id", lot.id);

    setShowAnnuler(false);
    setLoading(false);
    router.refresh();
  }

  // Nouveau → Enregistrer (sauvegarde et retour au dossier)
  if (status === "brouillon") {
    return (
      <Button
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await supabase.from("lots").update({ updated_at: new Date().toISOString() }).eq("id", lot.id);
          setLoading(false);
          router.push(`/dossiers/${lot.dossier.id}`);
        }}
      >
        <FloppyDisk size={16} weight="duotone" />
        {loading ? "Sauvegarde..." : "Enregistrer"}
      </Button>
    );
  }

  // En cours → Livré / Annuler
  if (status === "en_cours") {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={loading} onClick={handleMarquerLivre}>
          <Truck size={16} weight="duotone" />
          {loading ? "En cours..." : "Marquer livré"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={() => setShowAnnuler(true)}
        >
          <XCircle size={16} weight="duotone" />
          Annuler
        </Button>

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

  // Livré → À régler
  if (status === "livre") {
    return (
      <Button size="sm" disabled={loading} onClick={handlePasserARegler}>
        <CurrencyEur size={16} weight="duotone" />
        {loading ? "En cours..." : "Passer à régler"}
      </Button>
    );
  }

  // À régler → Terminé (avec saisie mode de règlement)
  if (status === "a_regler") {
    return (
      <>
        <Button size="sm" disabled={loading} onClick={() => setShowReglement(true)}>
          <CheckCircle size={16} weight="duotone" />
          Marquer terminé
        </Button>

        <Dialog open={showReglement} onOpenChange={setShowReglement}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mode de règlement</DialogTitle>
              <DialogDescription>
                Sélectionnez le mode de paiement utilisé par le client.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select
                value={modeReglement}
                onValueChange={(v) => setModeReglement(v as ModeReglement)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un mode de règlement" />
                </SelectTrigger>
                <SelectContent>
                  {MODE_REGLEMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" size="sm" />}>
                Annuler
              </DialogClose>
              <Button
                size="sm"
                disabled={loading || !modeReglement}
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

  return null;
}
