"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Factory,
  Package,
  CheckCircle,
  Prohibit,
  FileText,
  WarningCircle,
  Flask,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EcartDialog } from "./ecart-dialog";
import { formatDate, formatCurrency } from "@/lib/format";
import type { BonLivraison } from "@/types/bon-livraison";

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  envoye: { label: "Envoyé", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "Reçu", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  traite: { label: "Traité", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  annule: { label: "Annulé", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

interface BonLivraisonCardProps {
  bdl: BonLivraison;
}

export function BonLivraisonCard({ bdl }: BonLivraisonCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showEcart, setShowEcart] = useState(false);
  const supabase = createClient();

  const statutConfig = STATUT_CONFIG[bdl.statut] ?? STATUT_CONFIG.brouillon;
  const fonderieName = bdl.fonderie?.nom ?? "Fonderie";
  const lignes = bdl.lignes ?? [];
  const nbLignes = lignes.length;

  // Count ecarts
  const nbEcarts = lignes.filter((l) => l.ecart_titrage || l.ecart_poids).length;

  // Group lines by metal/titrage for display
  const groups = new Map<string, { metal: string; titrage: string; pieces: number; poids: number; valeur: number }>();
  for (const l of lignes) {
    const key = `${l.metal ?? "?"}-${l.titrage_declare ?? "?"}`;
    const g = groups.get(key) ?? { metal: l.metal ?? "?", titrage: l.titrage_declare ?? "?", pieces: 0, poids: 0, valeur: 0 };
    g.pieces += 1;
    g.poids += l.poids_declare ?? 0;
    g.valeur += l.valeur_estimee ?? 0;
    groups.set(key, g);
  }

  async function handleEnvoyer() {
    setLoading(true);
    const { error } = await mutate(
      supabase.from("bons_livraison").update({
        statut: "envoye",
        date_envoi: new Date().toISOString(),
      }).eq("id", bdl.id),
      "Erreur lors du marquage comme envoyé",
      "Statut mis à jour"
    );
    setLoading(false);
    if (error) return;
    router.refresh();
  }

  async function handleRecu() {
    setLoading(true);
    const { error } = await mutate(
      supabase.from("bons_livraison").update({
        statut: "recu",
        date_reception: new Date().toISOString(),
      }).eq("id", bdl.id),
      "Erreur lors du marquage comme reçu",
      "Statut mis à jour"
    );
    setLoading(false);
    if (error) return;
    router.refresh();
  }

  async function handleAnnuler() {
    setLoading(true);

    // Revert stock items to en_stock
    const stockIds = lignes.map((l) => l.bijoux_stock_id);
    if (stockIds.length > 0) {
      const { error: stockError } = await mutate(
        supabase
          .from("bijoux_stock")
          .update({ statut: "en_stock" })
          .in("id", stockIds),
        "Erreur lors de la remise en stock des articles",
        "Statut mis à jour"
      );
      if (stockError) { setLoading(false); return; }
    }

    const { error } = await mutate(
      supabase.from("bons_livraison").update({
        statut: "annule",
      }).eq("id", bdl.id),
      "Erreur lors de l'annulation du bon de livraison",
      "Statut mis à jour"
    );
    setLoading(false);
    if (error) return;
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText size={16} weight="duotone" />
            {bdl.numero}
            <Badge variant="secondary" className={statutConfig.className}>
              {statutConfig.label}
            </Badge>
            {nbEcarts > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <WarningCircle size={12} weight="duotone" className="mr-0.5" />
                {nbEcarts} écart{nbEcarts > 1 ? "s" : ""}
              </Badge>
            )}
            <span className="ml-auto text-base font-bold">{formatCurrency(bdl.valeur_estimee)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Factory size={14} weight="duotone" />
            <span>{fonderieName}</span>
            <span>·</span>
            <span>{nbLignes} article{nbLignes > 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{bdl.poids_total.toFixed(2)}g</span>
            {bdl.date_envoi && (
              <>
                <span>·</span>
                <span>Envoyé le {formatDate(bdl.date_envoi)}</span>
              </>
            )}
            {bdl.date_reception && (
              <>
                <span>·</span>
                <span>Reçu le {formatDate(bdl.date_reception)}</span>
              </>
            )}
          </div>

          {/* Groups by metal/titrage */}
          <div className="space-y-1">
            {Array.from(groups.values()).map((g) => (
              <div
                key={`${g.metal}-${g.titrage}`}
                className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm"
              >
                <span className="font-medium">{g.metal} {g.titrage}</span>
                <span className="text-muted-foreground">
                  {g.pieces} pce{g.pieces > 1 ? "s" : ""} · {g.poids.toFixed(2)}g · {formatCurrency(g.valeur)}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {bdl.statut === "brouillon" && (
              <>
                <Button size="sm" variant="secondary" disabled={loading} onClick={handleEnvoyer}>
                  <Package size={14} weight="duotone" />
                  {loading ? "En cours..." : "Marquer envoyé"}
                </Button>
                <Button size="sm" variant="destructive" disabled={loading} onClick={handleAnnuler}>
                  <Prohibit size={14} weight="duotone" />
                  Annuler
                </Button>
              </>
            )}
            {bdl.statut === "envoye" && (
              <Button size="sm" variant="secondary" disabled={loading} onClick={handleRecu}>
                <CheckCircle size={14} weight="duotone" />
                {loading ? "En cours..." : "Reçu par fonderie"}
              </Button>
            )}
            {bdl.statut === "recu" && (
              <Button size="sm" variant="secondary" onClick={() => setShowEcart(true)}>
                <Flask size={14} weight="duotone" />
                Saisir résultats fonderie
              </Button>
            )}
            {bdl.statut === "traite" && nbEcarts > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowEcart(true)}>
                <WarningCircle size={14} weight="duotone" />
                Voir les écarts
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showEcart && (
        <EcartDialog
          open={showEcart}
          onOpenChange={setShowEcart}
          bdl={bdl}
        />
      )}
    </>
  );
}
