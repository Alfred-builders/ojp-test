"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, SpinnerGap } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CommandePageClient } from "@/components/commandes/commande-page-client";
import { ALL_WITH_DOSSIER_CLIENT } from "@/lib/supabase/queries";
import type { LotWithDossier } from "@/types/lot";
import type { CommandeLigneFlat } from "@/types/commande";
import type { BonCommande } from "@/types/bon-commande";
import type { BonLivraison } from "@/types/bon-livraison";
import type { Reglement } from "@/types/reglement";
import type { Fonderie } from "@/types/fonderie";
import type { VenteLigne } from "@/types/vente";

interface CommandeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotId: string;
}

interface CommandeData {
  lots: LotWithDossier[];
  lignes: CommandeLigneFlat[];
  bonsCommande: BonCommande[];
  bonsLivraison: BonLivraison[];
  reglements: Reglement[];
  ungroupedByFonderie: Array<{
    fonderie_id: string;
    fonderie_nom: string;
    ligne_ids: string[];
    total: number;
    count: number;
  }>;
  fonderies: Fonderie[];
}

export function CommandeDialog({ open, onOpenChange, lotId }: CommandeDialogProps) {
  const router = useRouter();
  const [data, setData] = useState<CommandeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      const supabase = createClient();

      // Fetch the lot
      const { data: lot } = await supabase
        .from("lots")
        .select(ALL_WITH_DOSSIER_CLIENT)
        .eq("id", lotId)
        .single();

      if (cancelled) return;
      if (!lot) { setError("Lot introuvable."); setLoading(false); return; }

      const lots = [lot] as LotWithDossier[];

      // Fetch or_invest lignes for this lot
      const { data: lignes } = await supabase
        .from("vente_lignes")
        .select("*")
        .eq("lot_id", lotId)
        .not("or_investissement_id", "is", null)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      // Fetch stock for or_invest items
      const orIds = [...new Set((lignes ?? []).map((l: VenteLigne) => l.or_investissement_id).filter(Boolean))];
      let stockMap: Record<string, number> = {};
      if (orIds.length > 0) {
        const { data: orItems } = await supabase
          .from("or_investissement")
          .select("id, quantite")
          .in("id", orIds);
        stockMap = Object.fromEntries((orItems ?? []).map((i: { id: string; quantite: number }) => [i.id, i.quantite]));
      }

      const client = (lot as LotWithDossier).dossier?.client;
      const clientName = client
        ? `${client.civility === "M" ? "M." : "Mme"} ${client.first_name} ${client.last_name}`
        : "—";

      const flatLignes: CommandeLigneFlat[] = (lignes ?? []).map((l: VenteLigne) => ({
        id: l.id,
        lot_id: l.lot_id,
        lot_numero: (lot as LotWithDossier).numero ?? "",
        client_name: clientName,
        client_id: client?.id ?? "",
        dossier_id: (lot as LotWithDossier).dossier?.id ?? "",
        or_investissement_id: l.or_investissement_id!,
        designation: l.designation,
        metal: l.metal,
        poids: l.poids,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
        prix_total: l.prix_total,
        fulfillment: l.fulfillment ?? "pending",
        fonderie_id: l.fonderie_id ?? null,
        stock_disponible: stockMap[l.or_investissement_id!] ?? 0,
      }));

      // Fetch bons de commande, fonderies, reglements, bons de livraison
      const [
        { data: bdcData },
        { data: fonderieReglements },
        { data: ungroupedLignes },
        { data: allFonderies },
        { data: bdlData },
      ] = await Promise.all([
        supabase.from("bons_commande").select("*, fonderie:fonderies(*)").order("created_at", { ascending: false }),
        supabase.from("reglements").select("*").eq("type", "fonderie").order("date_reglement", { ascending: true }),
        supabase.from("vente_lignes").select("*").eq("fulfillment", "commande").not("fonderie_id", "is", null).is("bon_commande_id", null),
        supabase.from("fonderies").select("*").order("nom"),
        supabase.from("bons_livraison").select("*, fonderie:fonderies(*), lignes:bon_livraison_lignes(*)").order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      const bdcList = (bdcData ?? []) as BonCommande[];
      const bdcIds = bdcList.map((b) => b.id);
      if (bdcIds.length > 0) {
        const { data: bdcLignes } = await supabase
          .from("vente_lignes")
          .select("*")
          .in("bon_commande_id", bdcIds);
        for (const bdc of bdcList) {
          bdc.lignes = ((bdcLignes ?? []) as VenteLigne[]).filter((l) => l.bon_commande_id === bdc.id);
        }
      }

      const fonderieNameMap = Object.fromEntries((allFonderies ?? []).map((f: Fonderie) => [f.id, f.nom]));

      const ungroupedByFonderie: CommandeData["ungroupedByFonderie"] = [];
      const grouped = new Map<string, { ids: string[]; total: number }>();
      for (const l of (ungroupedLignes ?? [])) {
        if (!l.fonderie_id) continue;
        const existing = grouped.get(l.fonderie_id) ?? { ids: [], total: 0 };
        existing.ids.push(l.id);
        existing.total += l.prix_total;
        grouped.set(l.fonderie_id, existing);
      }
      for (const [fId, d] of grouped) {
        ungroupedByFonderie.push({
          fonderie_id: fId,
          fonderie_nom: fonderieNameMap[fId] ?? "Fonderie",
          ligne_ids: d.ids,
          total: d.total,
          count: d.ids.length,
        });
      }

      if (cancelled) return;

      setData({
        lots,
        lignes: flatLignes,
        bonsCommande: bdcList,
        bonsLivraison: (bdlData ?? []) as BonLivraison[],
        reglements: (fonderieReglements ?? []) as Reglement[],
        ungroupedByFonderie,
        fonderies: (allFonderies ?? []) as Fonderie[],
      });
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [open, lotId]);

  function handleClose() {
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[calc(100vw-4rem)] h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart size={20} weight="duotone" />
            Commandes — Références à commander
          </DialogTitle>
          <DialogDescription>
            Gérez les commandes et dispatchez les références vers le stock ou les fonderies.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-1">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <SpinnerGap size={32} weight="regular" className="animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          )}
          {data && (
            <CommandePageClient
              lots={data.lots}
              lignes={data.lignes}
              bonsCommande={data.bonsCommande}
              bonsLivraison={data.bonsLivraison}
              reglements={data.reglements}
              ungroupedByFonderie={data.ungroupedByFonderie}
              fonderies={data.fonderies}
              hideEnvois
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
