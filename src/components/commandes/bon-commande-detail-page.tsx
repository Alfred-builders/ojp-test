"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Factory,
  Package,
  CheckCircle,
  Prohibit,
  CurrencyEur,
  Coins,
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
import { Header } from "@/components/dashboard/header";
import { ReglementDialog } from "@/components/reglements/reglement-dialog";
import { formatDate, formatCurrency } from "@/lib/format";
import type { BonCommande } from "@/types/bon-commande";
import type { Reglement } from "@/types/reglement";
import type { PaymentDue } from "@/lib/reglements/detect-payments-due";

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  envoye: { label: "Envoyé", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "Reçu", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  paye: { label: "Payé", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  annule: { label: "Annulé", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

interface BonCommandeDetailPageProps {
  bdc: BonCommande;
  reglements: Reglement[];
}

export function BonCommandeDetailPage({ bdc, reglements }: BonCommandeDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPaiement, setShowPaiement] = useState(false);
  const supabase = createClient();

  const statutConfig = STATUT_CONFIG[bdc.statut] ?? STATUT_CONFIG.brouillon;
  const fonderieName = bdc.fonderie?.nom ?? "Fonderie";
  const lignes = bdc.lignes ?? [];

  const dejaPaye = reglements.reduce((sum, r) => sum + r.montant, 0);
  const restant = Math.max(0, bdc.montant_total - dejaPaye);

  async function handleEnvoyer() {
    setLoading(true);
    const { error } = await supabase.from("bons_commande").update({
      statut: "envoye",
      date_envoi: new Date().toISOString(),
    }).eq("id", bdc.id);
    setLoading(false);
    if (error) { toast.error("Erreur lors de la mise à jour du bon de commande"); return; }
    toast.success("Bon de commande envoyé");
    router.refresh();
  }

  async function handleRecu() {
    setLoading(true);
    const { error } = await supabase.from("bons_commande").update({
      statut: "recu",
      date_reception: new Date().toISOString(),
    }).eq("id", bdc.id);
    if (error) { setLoading(false); toast.error("Erreur lors de la mise à jour du bon de commande"); return; }
    if (lignes.length > 0) {
      const { error: lignesError } = await supabase.from("vente_lignes").update({ fulfillment: "recu" }).in("id", lignes.map((l) => l.id));
      if (lignesError) { setLoading(false); toast.error("Erreur lors de la mise à jour des lignes"); return; }
    }
    setLoading(false);
    toast.success("Bon de commande reçu");
    router.refresh();
  }

  async function handleAnnuler() {
    setLoading(true);
    const { error } = await supabase.from("bons_commande").update({ statut: "annule" }).eq("id", bdc.id);
    setLoading(false);
    if (error) { toast.error("Erreur lors de l'annulation du bon de commande"); return; }
    toast.success("Bon de commande annulé");
    router.refresh();
  }

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
      <Header
        title={bdc.numero}
        backAction={
          <Link href="/commandes">
            <Button variant="ghost" size="icon-sm" aria-label="Retour">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <Badge variant="secondary" className={statutConfig.className}>
          {statutConfig.label}
        </Badge>
      </Header>

      <div className="flex-1 p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} weight="duotone" />
                Bon de commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Numéro</span>
                <span className="font-medium">{bdc.numero}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Montant total</span>
                <span className="font-medium">{formatCurrency(bdc.montant_total)}</span>
              </div>
              {bdc.date_envoi && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Date d&apos;envoi</span>
                  <span className="font-medium">{formatDate(bdc.date_envoi)}</span>
                </div>
              )}
              {bdc.date_reception && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Date de réception</span>
                  <span className="font-medium">{formatDate(bdc.date_reception)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fonderie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory size={20} weight="duotone" />
                Fonderie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Nom</span>
                <span className="font-medium">{fonderieName}</span>
              </div>
              {bdc.fonderie?.adresse && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Adresse</span>
                  <span className="font-medium">{bdc.fonderie.adresse}</span>
                </div>
              )}
              {bdc.fonderie?.telephone && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span className="font-medium">{bdc.fonderie.telephone}</span>
                </div>
              )}
              {bdc.fonderie?.email && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{bdc.fonderie.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lignes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins size={20} weight="duotone" />
              Références ({lignes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lignes.map((ligne) => (
              <div
                key={ligne.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <span className="text-sm font-medium">{ligne.designation}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {ligne.metal && <span>{ligne.metal}</span>}
                    {ligne.poids && <span>· {ligne.poids}g</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{formatCurrency(ligne.prix_total)}</span>
                  <p className="text-xs text-muted-foreground">×{ligne.quantite} · {formatCurrency(ligne.prix_unitaire)}/u</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {bdc.statut === "brouillon" && (
            <>
              <Button disabled={loading} onClick={handleEnvoyer}>
                <Package size={16} weight="duotone" />
                {loading ? "En cours..." : "Marquer envoyé"}
              </Button>
              <Button variant="destructive" disabled={loading} onClick={handleAnnuler}>
                <Prohibit size={16} weight="duotone" />
                Annuler
              </Button>
            </>
          )}
          {bdc.statut === "envoye" && (
            <Button disabled={loading} onClick={handleRecu}>
              <CheckCircle size={16} weight="duotone" />
              {loading ? "En cours..." : "Marquer reçu"}
            </Button>
          )}
          {(bdc.statut === "envoye" || bdc.statut === "recu") && restant > 0 && (
            <Button variant="secondary" onClick={() => setShowPaiement(true)}>
              <CurrencyEur size={16} weight="duotone" />
              Payer ({formatCurrency(restant)})
            </Button>
          )}
          {restant <= 0 && bdc.statut !== "annule" && dejaPaye > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle size={12} weight="duotone" className="mr-0.5" />
              Payé
            </Badge>
          )}
        </div>
      </div>

      {showPaiement && (
        <ReglementDialog
          open={showPaiement}
          onOpenChange={setShowPaiement}
          paymentDue={paymentDue}
          lotId={lignes[0]?.lot_id}
        />
      )}
    </>
  );
}
