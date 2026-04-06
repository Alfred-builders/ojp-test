"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Factory,
  Diamond,
  Package,
  CheckCircle,
  Prohibit,
  WarningCircle,
  Check,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/dashboard/header";
import { formatDate, formatCurrency } from "@/lib/format";
import type { BonLivraison, BonLivraisonLigne } from "@/types/bon-livraison";

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  envoye: { label: "Envoyé", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "Reçu", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  traite: { label: "Traité", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  annule: { label: "Annulé", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

interface EcartState {
  titrage_reel: string;
  poids_reel: string;
  ecart_notes: string;
}

interface BonLivraisonDetailPageProps {
  bdl: BonLivraison;
}

export function BonLivraisonDetailPage({ bdl }: BonLivraisonDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingEcarts, setSavingEcarts] = useState(false);
  const supabase = createClient();

  const statutConfig = STATUT_CONFIG[bdl.statut] ?? STATUT_CONFIG.brouillon;
  const fonderieName = bdl.fonderie?.nom ?? "Fonderie";
  const lignes = bdl.lignes ?? [];
  const nbEcarts = lignes.filter((l) => l.ecart_titrage || l.ecart_poids).length;

  // Ecart editing state (only for statut === "recu")
  const [ecarts, setEcarts] = useState<Record<string, EcartState>>(() =>
    Object.fromEntries(
      lignes.map((l) => [
        l.id,
        {
          titrage_reel: l.titrage_reel ?? "",
          poids_reel: l.poids_reel != null ? String(l.poids_reel) : "",
          ecart_notes: l.ecart_notes ?? "",
        },
      ]),
    ),
  );

  function updateEcart(ligneId: string, field: keyof EcartState, value: string) {
    setEcarts((prev) => ({
      ...prev,
      [ligneId]: { ...prev[ligneId], [field]: value },
    }));
  }

  function computeValeurReelle(ligne: BonLivraisonLigne, ecart: EcartState): number | null {
    const titrageReel = parseInt(ecart.titrage_reel) || 0;
    const poidsReel = parseFloat(ecart.poids_reel) || 0;
    if (!titrageReel || !poidsReel || !ligne.cours_utilise || !ligne.titrage_declare) return null;
    const titrDeclare = parseInt(ligne.titrage_declare) || 1;
    const coursBase = ligne.cours_utilise / (titrDeclare / 1000);
    return Math.round(poidsReel * coursBase * (titrageReel / 1000) * 100) / 100;
  }

  // Group lines by metal/titrage
  const groups = new Map<string, { metal: string; titrage: string; lignes: BonLivraisonLigne[] }>();
  for (const l of lignes) {
    const key = `${l.metal ?? "?"}-${l.titrage_declare ?? "?"}`;
    const g = groups.get(key) ?? { metal: l.metal ?? "?", titrage: l.titrage_declare ?? "?", lignes: [] };
    g.lignes.push(l);
    groups.set(key, g);
  }

  async function handleEnvoyer() {
    setLoading(true);
    const { error } = await mutate(
      supabase.from("bons_livraison").update({
        statut: "envoye",
        date_envoi: new Date().toISOString(),
      }).eq("id", bdl.id),
      "Erreur lors du marquage comme envoyé"
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
      "Erreur lors du marquage comme reçu"
    );
    setLoading(false);
    if (error) return;
    router.refresh();
  }

  async function handleAnnuler() {
    setLoading(true);
    const stockIds = lignes.map((l) => l.bijoux_stock_id);
    if (stockIds.length > 0) {
      const { error: stockError } = await mutate(
        supabase.from("bijoux_stock").update({ statut: "en_stock" }).in("id", stockIds),
        "Erreur lors de la remise en stock des articles"
      );
      if (stockError) { setLoading(false); return; }
    }
    const { error } = await mutate(
      supabase.from("bons_livraison").update({ statut: "annule" }).eq("id", bdl.id),
      "Erreur lors de l'annulation du bon de livraison"
    );
    setLoading(false);
    if (error) return;
    router.refresh();
  }

  async function handleSaveEcarts() {
    setSavingEcarts(true);
    let hasError = false;
    for (const ligne of lignes) {
      const ecart = ecarts[ligne.id];
      if (!ecart) continue;

      const titrageReel = ecart.titrage_reel || null;
      const poidsReel = ecart.poids_reel ? parseFloat(ecart.poids_reel) : null;
      const valeurReelle = computeValeurReelle(ligne, ecart);
      const ecartTitrage = titrageReel != null && titrageReel !== ligne.titrage_declare;
      const ecartPoids = poidsReel != null && poidsReel !== ligne.poids_declare;

      const { error } = await mutate(
        supabase
          .from("bon_livraison_lignes")
          .update({
            titrage_reel: titrageReel,
            poids_reel: poidsReel,
            valeur_reelle: valeurReelle,
            ecart_titrage: ecartTitrage,
            ecart_poids: ecartPoids,
            ecart_notes: ecart.ecart_notes || null,
            date_test: new Date().toISOString(),
          })
          .eq("id", ligne.id),
        "Erreur lors de la mise à jour des résultats fonderie"
      );
      if (error) { hasError = true; break; }
    }

    if (hasError) { setSavingEcarts(false); return; }

    const { error } = await mutate(
      supabase.from("bons_livraison").update({
        statut: "traite",
        date_traitement: new Date().toISOString(),
      }).eq("id", bdl.id),
      "Erreur lors de la validation du bon de livraison"
    );
    setSavingEcarts(false);
    if (error) return;
    router.refresh();
  }

  return (
    <>
      <Header
        title={bdl.numero}
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
        {nbEcarts > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <WarningCircle size={12} weight="duotone" className="mr-0.5" />
            {nbEcarts} écart{nbEcarts > 1 ? "s" : ""}
          </Badge>
        )}
      </Header>

      <div className="flex-1 p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} weight="duotone" />
                Bon de livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Numéro</span>
                <span className="font-medium">{bdl.numero}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Poids total</span>
                <span className="font-medium">{bdl.poids_total.toFixed(2)}g</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Valeur estimée</span>
                <span className="font-medium">{formatCurrency(bdl.valeur_estimee)}</span>
              </div>
              {bdl.date_envoi && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Date d&apos;envoi</span>
                  <span className="font-medium">{formatDate(bdl.date_envoi)}</span>
                </div>
              )}
              {bdl.date_reception && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Date de réception</span>
                  <span className="font-medium">{formatDate(bdl.date_reception)}</span>
                </div>
              )}
              {bdl.date_traitement && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Date de traitement</span>
                  <span className="font-medium">{formatDate(bdl.date_traitement)}</span>
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
              {bdl.fonderie?.adresse && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Adresse</span>
                  <span className="font-medium">{bdl.fonderie.adresse}</span>
                </div>
              )}
              {bdl.fonderie?.ville && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Ville</span>
                  <span className="font-medium">{bdl.fonderie.code_postal} {bdl.fonderie.ville}</span>
                </div>
              )}
              {bdl.fonderie?.telephone && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span className="font-medium">{bdl.fonderie.telephone}</span>
                </div>
              )}
              {bdl.fonderie?.email && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{bdl.fonderie.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Références groupées par métal/titrage */}
        {Array.from(groups.values()).map((group) => {
          const groupPoids = group.lignes.reduce((s, l) => s + (l.poids_declare ?? 0), 0);
          const groupValeur = group.lignes.reduce((s, l) => s + (l.valeur_estimee ?? 0), 0);

          return (
            <Card key={`${group.metal}-${group.titrage}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Diamond size={18} weight="duotone" />
                    {group.metal} {group.titrage}
                    <Badge variant="outline">{group.lignes.length} pce{group.lignes.length > 1 ? "s" : ""}</Badge>
                  </div>
                  <span className="text-muted-foreground font-normal">
                    {groupPoids.toFixed(2)}g · {formatCurrency(groupValeur)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.lignes.map((ligne) => {
                  const ecart = ecarts[ligne.id];
                  const valReel = ecart ? computeValeurReelle(ligne, ecart) : null;
                  const ecartValeur = valReel != null && ligne.valeur_estimee != null
                    ? Math.round((valReel - ligne.valeur_estimee) * 100) / 100
                    : null;
                  const hasEcart = ligne.ecart_titrage || ligne.ecart_poids;
                  const canEdit = bdl.statut === "recu";
                  const isTraite = bdl.statut === "traite";

                  return (
                    <div
                      key={ligne.id}
                      className={`rounded-lg border p-4 space-y-3 ${hasEcart ? "border-amber-300 dark:border-amber-700" : ""}`}
                    >
                      {/* Main line info */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{ligne.designation}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>Poids : {ligne.poids_declare}g</span>
                            <span>Cours : {ligne.cours_utilise != null ? formatCurrency(ligne.cours_utilise) + "/g" : "—"}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold">{ligne.valeur_estimee != null ? formatCurrency(ligne.valeur_estimee) : "—"}</span>
                          {hasEcart && ecartValeur != null && (
                            <p className={`text-xs font-medium ${ecartValeur >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {ecartValeur > 0 ? "+" : ""}{formatCurrency(ecartValeur)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Ecart section — editable when recu, read-only when traité */}
                      {(canEdit || isTraite) && (
                        <div className="grid grid-cols-4 gap-3 pt-2 border-t">
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground">Titrage réel</label>
                            {canEdit ? (
                              <Input
                                className="h-8 mt-1"
                                placeholder="750"
                                value={ecart?.titrage_reel ?? ""}
                                onChange={(e) => updateEcart(ligne.id, "titrage_reel", e.target.value)}
                              />
                            ) : (
                              <p className={`text-sm mt-1 ${ligne.ecart_titrage ? "text-amber-600 font-medium" : ""}`}>
                                {ligne.titrage_reel || "—"}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground">Poids réel</label>
                            {canEdit ? (
                              <Input
                                className="h-8 mt-1"
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                                value={ecart?.poids_reel ?? ""}
                                onChange={(e) => updateEcart(ligne.id, "poids_reel", e.target.value)}
                              />
                            ) : (
                              <p className={`text-sm mt-1 ${ligne.ecart_poids ? "text-amber-600 font-medium" : ""}`}>
                                {ligne.poids_reel != null ? `${ligne.poids_reel}g` : "—"}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground">Valeur réelle</label>
                            <p className="text-sm mt-1">
                              {canEdit
                                ? (valReel != null ? formatCurrency(valReel) : "—")
                                : (ligne.valeur_reelle != null ? formatCurrency(ligne.valeur_reelle) : "—")
                              }
                            </p>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground">Notes</label>
                            {canEdit ? (
                              <Input
                                className="h-8 mt-1"
                                placeholder="Ex: plaqué or..."
                                value={ecart?.ecart_notes ?? ""}
                                onChange={(e) => updateEcart(ligne.id, "ecart_notes", e.target.value)}
                              />
                            ) : (
                              <p className="text-sm mt-1 text-muted-foreground">
                                {ligne.ecart_notes || "—"}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {bdl.statut === "brouillon" && (
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
          {bdl.statut === "envoye" && (
            <Button disabled={loading} onClick={handleRecu}>
              <CheckCircle size={16} weight="duotone" />
              {loading ? "En cours..." : "Reçu par fonderie"}
            </Button>
          )}
          {bdl.statut === "recu" && (
            <Button disabled={savingEcarts} onClick={handleSaveEcarts}>
              <Check size={16} weight="bold" />
              {savingEcarts ? "Enregistrement..." : "Valider les résultats fonderie"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
