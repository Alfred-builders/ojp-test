"use client";

import { useState, useEffect } from "react";
import { CopyableText } from "@/components/ui/copyable-text";
import Link from "next/link";
import { PreviewLink } from "@/components/preview/preview-link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  Storefront,
  User as PhUser,
  NotePencil,
  Plus,
  PencilSimple,
  FloppyDisk,
  FileText,
  Diamond,
  Coins,
  Timer,
  WarningCircle,
  ClipboardText,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Header } from "@/components/dashboard/header";
import { VenteStatusBadge } from "@/components/ventes/vente-status-badge";
import { VenteStatusActions } from "@/components/ventes/vente-status-actions";

import { LotStepper } from "@/components/lots/lot-stepper";
import { VenteLigneCard } from "@/components/ventes/vente-ligne-card";
import { StockPickerForm } from "@/components/ventes/stock-picker-dialog";
import { OrInvestPickerForm } from "@/components/ventes/or-invest-picker-form";
import { ReglementsCard } from "@/components/reglements/reglements-card";
import { detectPaymentsDue } from "@/lib/reglements/detect-payments-due";
import { getSettingClient } from "@/lib/settings-client";
import type { LotWithVenteLignes } from "@/types/lot";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/format";
import type { VenteStatus, Facture } from "@/types/vente";
import type { Fonderie } from "@/types/fonderie";
import type { Reglement } from "@/types/reglement";
import type { BonCommande } from "@/types/bon-commande";

interface VenteDetailPageProps {
  lot: LotWithVenteLignes & {
    dossier: {
      id: string;
      numero: string;
      client: {
        id: string;
        civility: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
        city: string | null;
        is_valid: boolean;
      };
    };
  };
  facture: Facture | null;
  orInvestStock?: Record<string, number>;
  fonderies?: Fonderie[];
  reglements?: Reglement[];
  bonsCommande?: BonCommande[];
}

export function VenteDetailPage({ lot, facture, orInvestStock = {}, fonderies = [], reglements = [], bonsCommande = [] }: VenteDetailPageProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showFormOrInvest, setShowFormOrInvest] = useState(false);
  const [editingLigne, setEditingLigne] = useState<import("@/types/vente").VenteLigne | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lot.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acomptePct, setAcomptePct] = useState(10);

  useEffect(() => {
    getSettingClient("business_rules").then((rules) => {
      if (rules) setAcomptePct(rules.acompte_pct);
    });
  }, []);

  const status = lot.status as VenteStatus;
  const isBrouillon = status === "brouillon";
  const isTerminal = status === "termine" || status === "annule";
  const clientName = `${lot.dossier.client.civility === "M" ? "M." : "Mme"} ${lot.dossier.client.first_name} ${lot.dossier.client.last_name}`;

  const existingStockIds = lot.lignes
    .map((l) => l.bijoux_stock_id)
    .filter((id): id is string => id !== null);

  const paymentsDue = detectPaymentsDue({
    lot,
    lignes: lot.lignes,
    reglements,
    bonsCommande,
    clientId: lot.dossier.client.id,
    acompte_pct: acomptePct,
  });

  // Fonderie map
  const fonderieMap = Object.fromEntries(fonderies.map((f) => [f.id, f.nom]));

  // Stepper computed values
  const hasOrInvest = lot.lignes.some((l) => l.or_investissement_id);
  const orInvestLignes = lot.lignes.filter((l) => l.or_investissement_id);
  const allLivre = lot.lignes.length > 0 && lot.lignes.every((l) => l.is_livre);

  // Compute worst fulfillment across or invest lines
  const fulfillmentOrder = ["pending", "a_commander", "commande", "recu", "servi_stock"];
  const worstFulfillment = orInvestLignes.length > 0
    ? orInvestLignes.reduce((worst, l) => {
        const wIdx = fulfillmentOrder.indexOf(worst);
        const lIdx = fulfillmentOrder.indexOf(l.fulfillment ?? "pending");
        return lIdx < wIdx ? (l.fulfillment ?? "pending") : worst;
      }, "servi_stock")
    : "pending";

  async function handleDeleteLigne(ligneId: string) {
    const supabase = createClient();
    const ligne = lot.lignes.find((l) => l.id === ligneId);

    // Revert stock to original status
    if (ligne?.bijoux_stock_id) {
      const { data: stockItem } = await supabase
        .from("bijoux_stock")
        .select("depot_vente_lot_id")
        .eq("id", ligne.bijoux_stock_id)
        .single();

      const revertStatus = stockItem?.depot_vente_lot_id ? "en_depot_vente" : "en_stock";
      const { error: stockError } = await supabase
        .from("bijoux_stock")
        .update({ statut: revertStatus })
        .eq("id", ligne.bijoux_stock_id);
      if (stockError) { toast.error("Erreur lors de la mise à jour du stock"); return; }
    }

    const { error } = await supabase.from("vente_lignes").delete().eq("id", ligneId);
    if (error) { toast.error("Erreur lors de la suppression de la ligne"); return; }
    router.refresh();
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("lots")
      .update({ notes: notes || null })
      .eq("id", lot.id);
    setSavingNotes(false);
    if (error) { toast.error("Erreur lors de l'enregistrement des notes"); return; }
    setEditingNotes(false);
    router.refresh();
  }

  const modeReglementLabels: Record<string, string> = {
    especes: "Espèces",
    carte: "Carte bancaire",
    virement: "Virement",
    cheque: "Chèque",
  };

  return (
    <>
      <Header
        title={lot.numero}
        backAction={
          <Link href={`/dossiers/${lot.dossier.id}`}>
            <Button variant="ghost" size="icon-sm" aria-label="Retour">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <div className="flex items-center gap-2">
          <VenteStatusBadge status={status} />
          {isBrouillon && (
            <Button
              size="sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const supabase = createClient();
                const { error } = await supabase.from("lots").update({ updated_at: new Date().toISOString() }).eq("id", lot.id);
                setSaving(false);
                if (error) { toast.error("Erreur lors de l'enregistrement"); return; }
                router.push(`/dossiers/${lot.dossier.id}`);
              }}
            >
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
        </div>
      </Header>

      <div className="flex-1 p-6 space-y-6">
        {/* Acompte 48h deadline alert */}
        {lot.acompte_paye && !lot.solde_paye && lot.date_limite_solde && status === "en_cours" && (() => {
          const deadline = new Date(lot.date_limite_solde);
          const now = new Date();
          const remaining = deadline.getTime() - now.getTime();
          const isExpired = remaining <= 0;
          const hours = Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
          const minutes = Math.max(0, Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)));
          const deadlineStr = formatDateTime(deadline.toISOString());

          return (
            <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${isExpired ? "border-destructive bg-destructive/5" : "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"}`}>
              {isExpired ? (
                <WarningCircle size={20} weight="duotone" className="text-destructive shrink-0" />
              ) : (
                <Timer size={20} weight="duotone" className="text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <div className="flex-1 text-sm">
                {isExpired ? (
                  <span className="font-medium text-destructive">Délai de paiement expiré — cette commande sera annulée automatiquement.</span>
                ) : (
                  <>
                    <span className="font-medium">Acompte de {formatCurrency(lot.acompte_montant)} encaissé.</span>
                    <span className="text-muted-foreground"> Solde à régler avant le {deadlineStr} ({hours}h{minutes.toString().padStart(2, "0")} restantes)</span>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Vente info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Storefront size={20} weight="duotone" />
                Informations de la vente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DetailRow label="Numéro" value={lot.numero} />
              <DetailRow label="Type" value="Vente" />
              <DetailRow
                label="Dossier"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    {lot.dossier.numero}
                    <PreviewLink entityType="dossier" entityId={lot.dossier.id} href={`/dossiers/${lot.dossier.id}`}>
                      <ArrowSquareOut size={14} weight="duotone" className="text-muted-foreground hover:text-foreground transition-colors" />
                    </PreviewLink>
                  </span>
                }
              />
              <DetailRow label="Date de création" value={formatDate(lot.created_at)} />
              {lot.date_livraison && (
                <DetailRow label="Date de livraison" value={formatDate(lot.date_livraison)} />
              )}
              {lot.date_reglement && (
                <DetailRow label="Date de règlement" value={formatDate(lot.date_reglement)} />
              )}
              {lot.mode_reglement && (
                <DetailRow label="Mode de règlement" value={modeReglementLabels[lot.mode_reglement] ?? lot.mode_reglement} />
              )}
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PhUser size={20} weight="duotone" />
                Client
              </CardTitle>
              <PreviewLink entityType="client" entityId={lot.dossier.client.id} href={`/clients/${lot.dossier.client.id}`}>
                <Button variant="secondary" size="sm">
                  <ArrowSquareOut size={14} weight="duotone" />
                  Voir le client
                </Button>
              </PreviewLink>
            </CardHeader>
            <CardContent>
              <DetailRow label="Nom" value={
                <span className="inline-flex items-center gap-2">
                  {clientName}
                  <Badge
                    variant={lot.dossier.client.is_valid ? "default" : "destructive"}
                    className={lot.dossier.client.is_valid ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30" : ""}
                  >
                    {lot.dossier.client.is_valid ? "Valide" : "Non valide"}
                  </Badge>
                </span>
              } />
              <DetailRow label="Téléphone" value={lot.dossier.client.phone ? <CopyableText value={lot.dossier.client.phone} /> : "—"} />
              <DetailRow label="Email" value={lot.dossier.client.email ? <CopyableText value={lot.dossier.client.email} /> : "—"} />
              <DetailRow label="Ville" value={lot.dossier.client.city ?? "—"} />
            </CardContent>
          </Card>
        </div>

        {/* Stepper */}
        <LotStepper
          lotType="vente"
          lotStatus={lot.status}
          hasOrInvest={hasOrInvest}
          worstFulfillment={worstFulfillment}
          allLivre={allLivre}
          isError={status === "annule"}
        />

        {/* Facture */}
        {facture && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} weight="duotone" />
                Facture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DetailRow label="Numéro" value={facture.numero} />
              <DetailRow label="Montant HT" value={formatCurrency(facture.montant_ht)} />
              <DetailRow label="Taxes" value={formatCurrency(facture.montant_taxe)} />
              <DetailRow label="Montant TTC" value={formatCurrency(facture.montant_ttc)} />
              <DetailRow label="Date d'émission" value={formatDate(facture.date_emission)} />
            </CardContent>
          </Card>
        )}

        {/* Articles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Storefront size={20} weight="duotone" />
              Articles ({lot.lignes.length})
            </CardTitle>
            {!isBrouillon && hasOrInvest && (
              <Link href="/commandes">
                <Button variant="outline" size="sm">
                  <ClipboardText size={14} weight="duotone" />
                  Accéder aux commandes
                </Button>
              </Link>
            )}
            {isBrouillon && !showForm && !showFormOrInvest && !editingLigne && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="secondary" size="sm">
                      <Plus size={14} weight="bold" />
                      Référence
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => { setShowForm(true); setShowFormOrInvest(false); setEditingLigne(null); }}>
                    <Diamond size={16} weight="duotone" />
                    Bijou
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setShowFormOrInvest(true); setShowForm(false); setEditingLigne(null); }}>
                    <Coins size={16} weight="duotone" />
                    Or Investissement
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {showForm && (
              <StockPickerForm
                lotId={lot.id}
                onClose={() => setShowForm(false)}
                excludeIds={existingStockIds}
              />
            )}
            {showFormOrInvest && (
              <OrInvestPickerForm
                lotId={lot.id}
                onClose={() => setShowFormOrInvest(false)}
                coursOrSnapshot={lot.cours_or_snapshot ?? 0}
                coursArgentSnapshot={lot.cours_argent_snapshot ?? 0}
                coefficientVenteSnapshot={lot.coefficient_vente_snapshot ?? 0}
              />
            )}
            {lot.lignes.length === 0 && !showForm && !showFormOrInvest ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun article. Ajoutez des bijoux ou de l&apos;or investissement.
              </p>
            ) : (
              lot.lignes.map((ligne) =>
                editingLigne?.id === ligne.id ? (
                  <StockPickerForm
                    key={ligne.id}
                    lotId={lot.id}
                    onClose={() => setEditingLigne(null)}
                    excludeIds={existingStockIds.filter((id) => id !== ligne.bijoux_stock_id)}
                    editData={ligne}
                  />
                ) : (
                  <VenteLigneCard
                    key={ligne.id}
                    ligne={ligne}
                    onEdit={(l) => setEditingLigne(l)}
                    onDelete={handleDeleteLigne}
                    canEdit={isBrouillon}
                    showLivraison={status === "en_cours"}
                    onLivraisonChange={() => router.refresh()}
                    showFulfillment={status === "en_cours"}
                    orInvestStock={ligne.or_investissement_id ? (orInvestStock[ligne.or_investissement_id] ?? 0) : 0}
                    fonderieName={ligne.fonderie_id ? fonderieMap[ligne.fonderie_id] : undefined}
                  />
                )
              )
            )}
          </CardContent>
        </Card>

        {/* Terminer la vente — card contextuelle */}
        {status === "en_cours" && (
          <VenteStatusActions lot={lot} reglements={reglements} mode="terminer" />
        )}

        {/* Reglements */}
        {status !== "brouillon" && (
          <ReglementsCard
            lotId={lot.id}
            reglements={reglements}
            paymentsDue={paymentsDue}
          />
        )}

        {/* Notes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <NotePencil size={20} weight="duotone" />
              Notes
            </CardTitle>
            {editingNotes ? (
              <Button variant="secondary" size="sm" disabled={savingNotes} onClick={handleSaveNotes}>
                <FloppyDisk size={14} weight="duotone" />
                {savingNotes ? "Enregistrement..." : "Enregistrer"}
              </Button>
            ) : (
              !isTerminal && (
                <Button variant="ghost" size="icon-sm" onClick={() => setEditingNotes(true)} aria-label="Modifier les notes">
                  <PencilSimple size={16} weight="duotone" />
                </Button>
              )
            )}
          </CardHeader>
          <CardContent>
            {editingNotes ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes sur la vente..."
                className="min-h-[100px] resize-none"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {lot.notes ?? "Aucune note."}
              </p>
            )}
          </CardContent>
        </Card>

      </div>
    </>
  );
}

function DetailRow({ label, value, noBorder }: { label: string; value: React.ReactNode; noBorder?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${noBorder ? "" : "border-b last:border-0"}`}>
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
