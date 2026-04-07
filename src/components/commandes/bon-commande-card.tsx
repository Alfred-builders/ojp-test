"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Storefront,
  Package,
  CheckCircle,
  CurrencyEur,
  Prohibit,
  FileText,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReglementDialog } from "@/components/reglements/reglement-dialog";
import { formatDate, formatCurrency } from "@/lib/format";
import type { BonCommande } from "@/types/bon-commande";
import type { Reglement } from "@/types/reglement";
import type { PaymentDue } from "@/lib/reglements/detect-payments-due";

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  envoye: { label: "Envoye", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "Recu", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  paye: { label: "Paye", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  annule: { label: "Annule", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

interface BonCommandeCardProps {
  bdc: BonCommande;
  reglements: Reglement[];
  lotId?: string;
}

export function BonCommandeCard({ bdc, reglements, lotId }: BonCommandeCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPaiement, setShowPaiement] = useState(false);
  const supabase = createClient();

  const statutConfig = STATUT_CONFIG[bdc.statut] ?? STATUT_CONFIG.brouillon;
  const fonderieName = bdc.fonderie?.nom ?? "Fonderie";
  const nbLignes = bdc.lignes?.length ?? 0;

  const dejaPaye = reglements
    .filter((r) => r.type === "fonderie" && r.bon_commande_id === bdc.id)
    .reduce((sum, r) => sum + r.montant, 0);
  const restant = Math.max(0, bdc.montant_total - dejaPaye);

  async function handleEnvoyer() {
    setLoading(true);
    const { error } = await supabase.from("bons_commande").update({
      statut: "envoye",
      date_envoi: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", bdc.id);
    setLoading(false);
    if (error) { toast.error("Erreur lors de la mise à jour du bon de commande"); return; }
    toast.success("Statut mis à jour");
    router.refresh();
  }

  async function handleRecu() {
    setLoading(true);
    // Update BDC status
    const { error } = await supabase.from("bons_commande").update({
      statut: "recu",
      date_reception: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", bdc.id);
    if (error) { setLoading(false); toast.error("Erreur lors de la mise à jour du bon de commande"); return; }

    // Update all attached lignes to "recu"
    if (bdc.lignes && bdc.lignes.length > 0) {
      const ligneIds = bdc.lignes.map((l) => l.id);
      const { error: lignesError } = await supabase.from("vente_lignes").update({ fulfillment: "recu" }).in("id", ligneIds);
      if (lignesError) { setLoading(false); toast.error("Erreur lors de la mise à jour des lignes"); return; }
    }

    setLoading(false);
    toast.success("Statut mis à jour");
    router.refresh();
  }

  async function handleAnnuler() {
    setLoading(true);
    const { error } = await supabase.from("bons_commande").update({
      statut: "annule",
      updated_at: new Date().toISOString(),
    }).eq("id", bdc.id);
    setLoading(false);
    if (error) { toast.error("Erreur lors de l'annulation du bon de commande"); return; }
    toast.success("Statut mis à jour");
    router.refresh();
  }

  // Build PaymentDue for the dialog
  const paymentDue: PaymentDue = {
    type: "fonderie",
    sens: "sortant",
    label: `Paiement fonderie — ${bdc.numero}`,
    description: `Bon de commande ${bdc.numero} (${fonderieName})`,
    montant_attendu: bdc.montant_total,
    montant_deja_paye: dejaPaye,
    montant_restant: restant,
    is_fully_paid: restant <= 0,
    pre_fill: {
      type: "fonderie",
      sens: "sortant",
      montant: restant,
      fonderie_id: bdc.fonderie_id,
      bon_commande_id: bdc.id,
    },
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText size={16} weight="duotone" />
            {bdc.numero}
            <Badge variant="secondary" className={statutConfig.className}>
              {statutConfig.label}
            </Badge>
            <span className="ml-auto text-base font-bold">{formatCurrency(bdc.montant_total)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Storefront size={14} weight="duotone" />
            <span>{fonderieName}</span>
            <span>·</span>
            <span>{nbLignes} ligne{nbLignes > 1 ? "s" : ""}</span>
            {bdc.date_envoi && (
              <>
                <span>·</span>
                <span>Envoye le {formatDate(bdc.date_envoi)}</span>
              </>
            )}
            {bdc.date_reception && (
              <>
                <span>·</span>
                <span>Recu le {formatDate(bdc.date_reception)}</span>
              </>
            )}
          </div>

          {/* Lignes */}
          {bdc.lignes && bdc.lignes.length > 0 && (
            <div className="space-y-1">
              {bdc.lignes.map((ligne) => (
                <div key={ligne.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm">
                  <span>{ligne.designation}</span>
                  <span className="text-muted-foreground">x{ligne.quantite} · {formatCurrency(ligne.prix_total)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {bdc.statut === "brouillon" && (
              <>
                <Button size="sm" variant="secondary" disabled={loading} onClick={handleEnvoyer}>
                  <Package size={14} weight="duotone" />
                  {loading ? "En cours..." : "Marquer envoye"}
                </Button>
                <Button size="sm" variant="destructive" disabled={loading} onClick={handleAnnuler}>
                  <Prohibit size={14} weight="duotone" />
                  Annuler
                </Button>
              </>
            )}
            {bdc.statut === "envoye" && (
              <Button size="sm" variant="secondary" disabled={loading} onClick={handleRecu}>
                <CheckCircle size={14} weight="duotone" />
                {loading ? "En cours..." : "Marquer recu"}
              </Button>
            )}
            {(bdc.statut === "envoye" || bdc.statut === "recu") && restant > 0 && lotId && (
              <Button size="sm" variant="secondary" onClick={() => setShowPaiement(true)}>
                <CurrencyEur size={14} weight="duotone" />
                Payer ({formatCurrency(restant)})
              </Button>
            )}
            {restant <= 0 && bdc.statut !== "annule" && dejaPaye > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle size={12} weight="duotone" className="mr-0.5" />
                Paye
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {showPaiement && lotId && (
        <ReglementDialog
          open={showPaiement}
          onOpenChange={setShowPaiement}
          paymentDue={paymentDue}
          lotId={lotId}
        />
      )}
    </>
  );
}
