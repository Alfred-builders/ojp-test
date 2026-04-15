"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Factory,
  Package,
  CheckCircle,
  CurrencyEur,
  Coins,
  Check,
  Lightning,
  Money,
  Handshake,
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
import { DocumentsTable } from "@/components/documents/documents-table";
import { formatDate, formatCurrency } from "@/lib/format";
import type { BonCommande } from "@/types/bon-commande";
import type { Reglement } from "@/types/reglement";
import type { DocumentRecord } from "@/types/document";
import { BDC_STATUS_CONFIG, FULFILLMENT_BADGE } from "@/lib/fonderie/status-config";
import type { PaymentDue } from "@/lib/reglements/detect-payments-due";
import type { FulfillmentStatus } from "@/types/vente";

interface BonCommandeDetailPageProps {
  bdc: BonCommande;
  reglements: Reglement[];
  documents?: DocumentRecord[];
}

export function BonCommandeDetailPage({ bdc, reglements, documents = [] }: BonCommandeDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recevingLigne, setRecevingLigne] = useState<string | null>(null);
  const [livrantLigne, setLivrantLigne] = useState<string | null>(null);
  const [showPaiement, setShowPaiement] = useState(false);
  const supabase = createClient();

  const statutConfig = BDC_STATUS_CONFIG[bdc.statut] ?? BDC_STATUS_CONFIG.brouillon;
  const fonderieName = bdc.fonderie?.nom ?? "Fonderie";
  const lignes = bdc.lignes ?? [];

  const dejaPaye = reglements.reduce((sum, r) => sum + r.montant, 0);
  const restant = Math.max(0, bdc.montant_total - dejaPaye);

  // Count received lines
  const nbRecu = lignes.filter((l) => l.fulfillment === "recu").length;
  const allRecu = lignes.length > 0 && nbRecu === lignes.length;

  // Find the BDC document for linking payment
  const bdcDocument = documents.find((d) => d.type === "bon_commande");

  // Delivery tracking
  const nbLivre = lignes.filter((l) => l.is_livre).length;
  const nbRecuNonLivre = lignes.filter((l) => l.fulfillment === "recu" && !l.is_livre).length;
  const allLivre = lignes.length > 0 && lignes.every((l) => l.is_livre);

  // Reception is possible when envoyé OR payé (paiement et réception sont indépendants)
  const canReceiveLines = bdc.statut === "envoye" || bdc.statut === "paye" || bdc.statut === "recu";

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

  async function handleRecuLigne(ligneId: string) {
    setRecevingLigne(ligneId);
    const { error } = await supabase.from("vente_lignes").update({
      fulfillment: "recu" as FulfillmentStatus,
    }).eq("id", ligneId);

    if (error) {
      setRecevingLigne(null);
      toast.error("Erreur lors de la mise à jour de la ligne");
      return;
    }

    // Check if all lines are now received
    const remainingPending = lignes.filter(
      (l) => l.id !== ligneId && l.fulfillment !== "recu",
    );

    if (remainingPending.length === 0) {
      // All lines received → only advance to "recu" if currently "envoye" (don't overwrite "paye")
      if (bdc.statut === "envoye") {
        await supabase.from("bons_commande").update({
          statut: "recu",
          date_reception: new Date().toISOString(),
        }).eq("id", bdc.id);
      }
      toast.success("Toutes les lignes reçues — bon de commande reçu");
    } else {
      toast.success("Ligne marquée comme reçue");
    }

    setRecevingLigne(null);
    router.refresh();
  }

  async function handleRecuTout() {
    setLoading(true);
    // Only advance to "recu" if currently "envoye" (don't overwrite "paye")
    if (bdc.statut === "envoye") {
      const { error } = await supabase.from("bons_commande").update({
        statut: "recu",
        date_reception: new Date().toISOString(),
      }).eq("id", bdc.id);
      if (error) { setLoading(false); toast.error("Erreur lors de la mise à jour du bon de commande"); return; }
    }
    if (lignes.length > 0) {
      const { error: lignesError } = await supabase.from("vente_lignes").update({ fulfillment: "recu" as FulfillmentStatus }).in("id", lignes.map((l) => l.id));
      if (lignesError) { setLoading(false); toast.error("Erreur lors de la mise à jour des lignes"); return; }
    }
    setLoading(false);
    toast.success("Bon de commande reçu");
    router.refresh();
  }

  async function handleAnnuler() {
    setLoading(true);
    // Remettre les lignes en a_commander (dispatch)
    const ligneIds = lignes.map((l) => l.id);
    if (ligneIds.length > 0) {
      await supabase.from("vente_lignes").update({
        fulfillment: "a_commander" as FulfillmentStatus,
        bon_commande_id: null,
        fonderie_id: null,
      }).in("id", ligneIds);
    }
    const { error } = await supabase.from("bons_commande").update({ statut: "annule" }).eq("id", bdc.id);
    setLoading(false);
    if (error) { toast.error("Erreur lors de l'annulation du bon de commande"); return; }
    toast.success("Bon de commande annulé — lignes remises en dispatch");
    router.push("/fonderie/routage");
  }

  async function handleLivrerLigne(ligneId: string) {
    setLivrantLigne(ligneId);
    const { error } = await supabase.from("vente_lignes").update({ is_livre: true }).eq("id", ligneId);
    if (error) { setLivrantLigne(null); toast.error("Erreur lors de la mise à jour"); return; }
    toast.success("Article marqué comme livré au client");
    setLivrantLigne(null);
    // Check auto-finalization
    const allWillBeLivre = lignes.every((l) => l.id === ligneId || l.is_livre);
    if (allWillBeLivre) await tryAutoFinalize();
    router.refresh();
  }

  async function handleLivrerTout() {
    setLoading(true);
    const ids = lignes.filter((l) => l.fulfillment === "recu" && !l.is_livre).map((l) => l.id);
    if (ids.length > 0) {
      const { error } = await supabase.from("vente_lignes").update({ is_livre: true }).in("id", ids);
      if (error) { setLoading(false); toast.error("Erreur lors de la mise à jour"); return; }
    }
    toast.success("Articles marqués comme livrés au client");
    await tryAutoFinalize();
    setLoading(false);
    router.refresh();
  }

  async function tryAutoFinalize() {
    // Get lot_id from first ligne
    const lotId = lignes[0]?.lot_id;
    if (!lotId) return;

    // Condition 1: all factures réglées
    const { data: lotDocs } = await supabase
      .from("documents")
      .select("id, status, type")
      .eq("lot_id", lotId)
      .in("type", ["facture_vente", "facture_acompte", "facture_solde"]);
    const allFacturesReglees = (lotDocs ?? []).every((d) => d.status === "regle");

    // Condition 2: all or invest lines fulfilled + delivered
    const { data: orInvestLignes } = await supabase
      .from("vente_lignes")
      .select("fulfillment, is_livre")
      .eq("lot_id", lotId)
      .not("or_investissement_id", "is", null);
    const allOrInvestOk = (orInvestLignes ?? []).every(
      (l: { fulfillment: string; is_livre: boolean }) =>
        (l.fulfillment === "servi_stock" || l.fulfillment === "recu") && l.is_livre,
    );

    // Condition 3: all BDC paid
    const { data: bdcLignes } = await supabase
      .from("vente_lignes")
      .select("bon_commande_id")
      .eq("lot_id", lotId)
      .not("bon_commande_id", "is", null);
    const bdcIds = [...new Set((bdcLignes ?? []).map((l: { bon_commande_id: string }) => l.bon_commande_id))];
    let allBdcPaid = true;
    if (bdcIds.length > 0) {
      const { data: bdcs } = await supabase.from("bons_commande").select("statut").in("id", bdcIds);
      allBdcPaid = (bdcs ?? []).every((b: { statut: string }) => b.statut === "paye" || b.statut === "annule");
    }

    // Condition 4: all vente lignes delivered
    const { data: allVenteLignes } = await supabase.from("vente_lignes").select("is_livre").eq("lot_id", lotId);
    const allLotLivre = (allVenteLignes ?? []).every((l: { is_livre: boolean }) => l.is_livre);

    if (!allFacturesReglees || !allOrInvestOk || !allBdcPaid || !allLotLivre) return;

    // All conditions met → finalize lot
    const { data: lot } = await supabase.from("lots").select("dossier_id, status").eq("id", lotId).single();
    if (!lot || lot.status === "finalise") return;

    // Mark bijoux as sold
    const { data: bijouxLignes } = await supabase
      .from("vente_lignes")
      .select("bijoux_stock_id")
      .eq("lot_id", lotId)
      .not("bijoux_stock_id", "is", null);
    for (const bl of bijouxLignes ?? []) {
      if (bl.bijoux_stock_id) {
        await supabase.from("bijoux_stock").update({ statut: "vendu" }).eq("id", bl.bijoux_stock_id);
      }
    }

    await supabase.from("lots").update({
      status: "finalise",
      outcome: "complete",
      date_finalisation: new Date().toISOString(),
      solde_paye: true,
    }).eq("id", lotId);

    // Check dossier finalization
    if (lot.dossier_id) {
      const { data: allLots } = await supabase.from("lots").select("status").eq("dossier_id", lot.dossier_id);
      if ((allLots ?? []).every((l: { status: string }) => l.status === "finalise")) {
        await supabase.from("dossiers").update({ status: "finalise" }).eq("id", lot.dossier_id);
      }
    }

    toast.success("Vente finalisée automatiquement");
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
      document_id: bdcDocument?.id,
    },
  };

  return (
    <>
      <Header
        title={bdc.numero}
        backAction={
          <Button variant="ghost" size="icon-sm" aria-label="Retour" onClick={() => router.back()}>
            <ArrowLeft size={16} weight="regular" />
          </Button>
        }
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={statutConfig.className}>
            {statutConfig.label}
          </Badge>
          {bdc.statut === "brouillon" && (
            <Button variant="outline" size="sm" disabled={loading} onClick={handleAnnuler}>
              Annuler le bon
            </Button>
          )}
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

        {/* Actions en attente */}
        {bdc.statut !== "annule" && (() => {
          const actionRows: Array<{ icon: React.ElementType; label: string; badge?: string; btn: React.ReactNode }> = [];

          if (restant > 0 && bdc.statut !== "brouillon") {
            actionRows.push({
              icon: Money,
              label: `${bdc.numero} | Paiement fonderie à effectuer`,
              badge: formatCurrency(restant),
              btn: (
                <Button size="sm" variant="outline" onClick={() => setShowPaiement(true)}>
                  <Money size={14} weight="duotone" />
                  Enregistrer
                </Button>
              ),
            });
          }

          if (canReceiveLines && !allRecu) {
            actionRows.push({
              icon: CheckCircle,
              label: nbRecu > 0
                ? `Réception | ${nbRecu}/${lignes.length} article${nbRecu > 1 ? "s" : ""} reçu${nbRecu > 1 ? "s" : ""}`
                : "Réception | Marquer les articles comme reçus",
              btn: (
                <Button size="sm" variant="outline" disabled={loading} onClick={handleRecuTout}>
                  <CheckCircle size={14} weight="duotone" />
                  {loading ? "..." : "Tout recevoir"}
                </Button>
              ),
            });
          }

          if (nbRecuNonLivre > 0) {
            actionRows.push({
              icon: Handshake,
              label: nbLivre > 0
                ? `Livraison | ${nbLivre}/${lignes.length} article${nbLivre > 1 ? "s" : ""} livré${nbLivre > 1 ? "s" : ""}`
                : "Livraison | Remettre les articles au client",
              btn: (
                <Button size="sm" variant="outline" disabled={loading} onClick={handleLivrerTout}>
                  <Handshake size={14} weight="duotone" />
                  {loading ? "..." : "Tout livrer"}
                </Button>
              ),
            });
          }

          if (bdc.statut === "brouillon") {
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
                          {parts.length === 2 ? (
                            <>
                              <span className="font-semibold">{parts[0]}</span>
                              <span className="text-muted-foreground mx-1.5">|</span>
                              {parts[1]}
                            </>
                          ) : (
                            row.label
                          )}
                        </span>
                        {row.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {row.badge}
                          </Badge>
                        )}
                      </div>
                      {row.btn}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

        {/* Lignes — réception ligne par ligne */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins size={20} weight="duotone" />
              Références ({lignes.length})
              {nbRecu > 0 && nbRecu < lignes.length && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {nbRecu}/{lignes.length} reçue{nbRecu > 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lignes.map((ligne) => {
              const isRecu = ligne.fulfillment === "recu";
              const isLivre = ligne.is_livre;
              const canReceive = canReceiveLines && !isRecu;
              const canDeliver = isRecu && !isLivre;

              return (
                <div
                  key={ligne.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    isLivre
                      ? "bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800"
                      : isRecu
                      ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isLivre ? (
                      <Handshake size={18} weight="duotone" className="text-purple-600 dark:text-purple-400 shrink-0" />
                    ) : isRecu ? (
                      <CheckCircle size={18} weight="duotone" className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : null}
                    <div>
                      <span className="text-sm font-medium">{ligne.designation}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {ligne.metal && <span>{ligne.metal}</span>}
                        {ligne.poids && <span>· {ligne.poids}g</span>}
                        <span>· x{ligne.quantite}</span>
                        <span>· {formatCurrency(ligne.prix_unitaire)}/u</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-bold">{formatCurrency(ligne.prix_total)}</span>
                    </div>
                    {isLivre && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        Livré
                      </Badge>
                    )}
                    {canDeliver && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={livrantLigne === ligne.id}
                        onClick={() => handleLivrerLigne(ligne.id)}
                        className="shrink-0"
                      >
                        <Handshake size={14} weight="duotone" />
                        {livrantLigne === ligne.id ? "..." : "Livrer au client"}
                      </Button>
                    )}
                    {canReceive && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={recevingLigne === ligne.id}
                        onClick={() => handleRecuLigne(ligne.id)}
                        className="shrink-0"
                      >
                        <Check size={14} weight="bold" />
                        {recevingLigne === ligne.id ? "..." : "Marquer comme reçu"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Récapitulatif paiement */}
            <div className="rounded-lg border bg-muted/50 px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <CurrencyEur size={16} weight="duotone" className="text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Récapitulatif</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Montant total</span>
                <span className="font-semibold text-foreground">{formatCurrency(bdc.montant_total)}</span>
              </div>
              {dejaPaye > 0 && (
                <div className="mt-3 space-y-1">
                  {reglements.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{formatDate(r.date_reglement)} · {r.mode}</span>
                      <span className="font-medium text-muted-foreground">− {formatCurrency(r.montant)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Reste à payer</span>
                  <span className={`text-lg font-bold ${restant <= 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                    {restant > 0 ? formatCurrency(restant) : "Soldé"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        {documents.length > 0 && (
          <DocumentsTable documents={documents} />
        )}
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
