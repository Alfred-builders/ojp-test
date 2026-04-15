"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Coins, Package, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

interface LigneRow {
  id: string;
  designation: string;
  metal: string | null;
  quantite: number;
  prix_total: number;
  fulfillment: string;
  is_livre: boolean;
}

interface LivraisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotId: string;
}

export function LivraisonDialog({ open, onOpenChange, lotId }: LivraisonDialogProps) {
  const router = useRouter();
  const [lignes, setLignes] = useState<LigneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    async function fetch() {
      setLoading(true);
      const supabase = createClient();
      // Only show lines that are fulfilled (servi_stock or recu) — ready to hand to client
      const { data } = await supabase
        .from("vente_lignes")
        .select("id, designation, metal, quantite, prix_total, fulfillment, is_livre")
        .eq("lot_id", lotId)
        .in("fulfillment", ["servi_stock", "recu"])
        .order("created_at", { ascending: true });
      setLignes((data ?? []) as LigneRow[]);
      setLoading(false);
    }
    fetch();
  }, [open, lotId]);

  async function toggleLivre(ligne: LigneRow) {
    setToggling(ligne.id);
    const supabase = createClient();
    const newValue = !ligne.is_livre;
    const { error } = await mutate(
      supabase.from("vente_lignes").update({ is_livre: newValue }).eq("id", ligne.id),
      "Erreur lors de la mise à jour",
      newValue ? "Article livré au client" : "Livraison annulée"
    );
    if (error) { setToggling(null); return; }

    // Update local state
    setLignes((prev) => prev.map((l) => l.id === ligne.id ? { ...l, is_livre: newValue } : l));

    // Check auto-finalization
    if (newValue) {
      const { data: allLignes } = await supabase
        .from("vente_lignes")
        .select("fulfillment, is_livre")
        .eq("lot_id", lotId);

      const allLivre = (allLignes ?? []).every((l) => l.is_livre);
      const allFulfilled = (allLignes ?? []).every(
        (l) => l.fulfillment === "servi_stock" || l.fulfillment === "recu"
      );

      if (allLivre && allFulfilled) {
        const { data: lotDocs } = await supabase
          .from("documents")
          .select("status, type")
          .eq("lot_id", lotId)
          .in("type", ["facture_vente", "facture_acompte", "facture_solde"]);
        const allPaid = (lotDocs ?? []).every((d) => d.status === "regle");

        if (allPaid) {
          const { data: lot } = await supabase
            .from("lots")
            .select("id, status, dossier_id")
            .eq("id", lotId)
            .single();

          if (lot && lot.status === "en_cours") {
            await supabase.from("lots").update({
              status: "finalise",
              outcome: "complete",
              date_finalisation: new Date().toISOString(),
            }).eq("id", lot.id);

            const { data: allLots } = await supabase
              .from("lots")
              .select("status")
              .eq("dossier_id", lot.dossier_id);
            if ((allLots ?? []).every((l) => l.status === "finalise")) {
              await supabase.from("dossiers").update({ status: "finalise" }).eq("id", lot.dossier_id);
            }

            toast.success("Vente finalisée automatiquement");
          }
        }
      }
    }

    setToggling(null);
    router.refresh();
  }

  const nonLivre = lignes.filter((l) => !l.is_livre);
  const livre = lignes.filter((l) => l.is_livre);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={20} weight="duotone" />
            Livraison au client
          </DialogTitle>
          <DialogDescription>
            {nonLivre.length > 0
              ? `${nonLivre.length} article${nonLivre.length > 1 ? "s" : ""} prêt${nonLivre.length > 1 ? "s" : ""} à livrer`
              : "Tous les articles ont été livrés"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
          ) : lignes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun article à livrer.</p>
          ) : (
            lignes.map((ligne) => (
              <div
                key={ligne.id}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${ligne.is_livre ? "bg-muted/30" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Coins size={16} weight="duotone" className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium block truncate">{ligne.designation}</span>
                    <span className="text-xs text-muted-foreground">
                      {ligne.metal ?? ""} · x{ligne.quantite} · {formatCurrency(ligne.prix_total)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  {ligne.is_livre ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle size={10} weight="duotone" className="mr-0.5" />
                        Livré
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                        disabled={toggling === ligne.id}
                        onClick={() => toggleLivre(ligne)}
                      >
                        {toggling === ligne.id ? "..." : "Annuler"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={toggling === ligne.id}
                      onClick={() => toggleLivre(ligne)}
                    >
                      <Package size={14} weight="duotone" />
                      {toggling === ligne.id ? "..." : "Livrer"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
