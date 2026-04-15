"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Factory,
  Diamond,
  Package,
  CheckCircle,
  WarningCircle,
  Check,
  Lightning,
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
import { DocumentsTable } from "@/components/documents/documents-table";
import { formatDate, formatCurrency } from "@/lib/format";
import { BDL_STATUS_CONFIG } from "@/lib/fonderie/status-config";
import type { BonLivraison, BonLivraisonLigne } from "@/types/bon-livraison";
import type { DocumentRecord } from "@/types/document";

interface EcartState {
  titrage_reel: string;
  poids_reel: string;
  ecart_notes: string;
}

interface BonLivraisonDetailPageProps {
  bdl: BonLivraison;
  documents?: DocumentRecord[];
}

export function BonLivraisonDetailPage({ bdl, documents = [] }: BonLivraisonDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingEcarts, setSavingEcarts] = useState(false);
  const supabase = createClient();

  const statutConfig = BDL_STATUS_CONFIG[bdl.statut] ?? BDL_STATUS_CONFIG.brouillon;
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
      "Erreur lors du marquage comme envoyé",
      "Bon de livraison envoyé"
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
      "Bon de livraison reçu"
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
        "Erreur lors de la remise en stock des articles",
        "Articles remis en stock"
      );
      if (stockError) { setLoading(false); return; }
    }
    const { error } = await mutate(
      supabase.from("bons_livraison").update({ statut: "annule" }).eq("id", bdl.id),
      "Erreur lors de l'annulation du bon de livraison",
      "Bon de livraison annulé"
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
        "Erreur lors de la mise à jour des résultats fonderie",
        "Résultats fonderie enregistrés"
      );
      if (error) { hasError = true; break; }
    }

    if (hasError) { setSavingEcarts(false); return; }

    const { error } = await mutate(
      supabase.from("bons_livraison").update({
        statut: "traite",
        date_traitement: new Date().toISOString(),
      }).eq("id", bdl.id),
      "Erreur lors de la validation du bon de livraison",
      "Bon de livraison traité"
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
          <Button variant="ghost" size="icon-sm" aria-label="Retour" onClick={() => router.back()}>
            <ArrowLeft size={16} weight="regular" />
          </Button>
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

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

        {/* Actions en attente */}
        {bdl.statut !== "annule" && (() => {
          const actionRows: Array<{ icon: React.ElementType; label: string; btn: React.ReactNode }> = [];

          if (bdl.statut === "recu") {
            actionRows.push({
              icon: Check,
              label: "Résultats fonderie | Saisir titrages et poids réels",
              btn: (
                <Button size="sm" variant="outline" disabled={savingEcarts} onClick={handleSaveEcarts}>
                  <Check size={14} weight="bold" />
                  {savingEcarts ? "..." : "Valider"}
                </Button>
              ),
            });
          }

          if (bdl.statut === "envoye") {
            actionRows.push({
              icon: CheckCircle,
              label: "Réception | Confirmer la réception par la fonderie",
              btn: (
                <Button size="sm" variant="outline" disabled={loading} onClick={handleRecu}>
                  <CheckCircle size={14} weight="duotone" />
                  {loading ? "..." : "Confirmer"}
                </Button>
              ),
            });
          }

          if (bdl.statut === "brouillon") {
            actionRows.push({
              icon: Package,
              label: "Envoi | Marquer comme envoyé à la fonderie",
              btn: (
                <Button size="sm" variant="outline" disabled={loading} onClick={handleEnvoyer}>
                  <Package size={14} weight="duotone" />
                  {loading ? "..." : "Envoyer"}
                </Button>
              ),
            });
          }

          if (actionRows.length === 0) return null;

          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightning size={20} weight="duotone" />
                  Actions en attente
                  <Badge variant="secondary">{actionRows.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {actionRows.map((row, i) => {
                  const Icon = row.icon;
                  const parts = row.label.split(" | ");
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Icon size={16} weight="duotone" className="text-muted-foreground" />
                        </div>
                        <span className="text-sm truncate">
                          <span className="font-semibold">{parts[0]}</span>
                          {parts.length === 2 && (
                            <>
                              <span className="text-muted-foreground mx-1.5">|</span>
                              {parts[1]}
                            </>
                          )}
                        </span>
                      </div>
                      {row.btn}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

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

        {/* Documents */}
        {documents.length > 0 && (
          <DocumentsTable documents={documents} />
        )}
      </div>
    </>
  );
}
