"use client";

import { useState } from "react";
import { CopyableText } from "@/components/ui/copyable-text";
import Link from "next/link";
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
} from "@phosphor-icons/react";
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
import { VenteSummaryCard } from "@/components/ventes/vente-summary-card";
import { VenteLigneCard } from "@/components/ventes/vente-ligne-card";
import { StockPickerForm } from "@/components/ventes/stock-picker-dialog";
import { OrInvestPickerForm } from "@/components/ventes/or-invest-picker-form";
import type { LotWithVenteLignes } from "@/types/lot";
import type { VenteStatus, Facture } from "@/types/vente";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

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
}

export function VenteDetailPage({ lot, facture }: VenteDetailPageProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showFormOrInvest, setShowFormOrInvest] = useState(false);
  const [editingLigne, setEditingLigne] = useState<import("@/types/vente").VenteLigne | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lot.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const status = lot.status as VenteStatus;
  const isBrouillon = status === "brouillon";
  const isTerminal = status === "termine" || status === "annule";
  const clientName = `${lot.dossier.client.civility === "M" ? "M." : "Mme"} ${lot.dossier.client.first_name} ${lot.dossier.client.last_name}`;

  const existingStockIds = lot.lignes
    .map((l) => l.bijoux_stock_id)
    .filter((id): id is string => id !== null);

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
      await supabase
        .from("bijoux_stock")
        .update({ statut: revertStatus })
        .eq("id", ligne.bijoux_stock_id);
    }

    await supabase.from("vente_lignes").delete().eq("id", ligneId);
    router.refresh();
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    const supabase = createClient();
    await supabase
      .from("lots")
      .update({ notes: notes || null })
      .eq("id", lot.id);
    setSavingNotes(false);
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
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <div className="flex items-center gap-2">
          <VenteStatusBadge status={status} />
          <VenteStatusActions lot={lot} />
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary cards */}
        <VenteSummaryCard
          totalPrixVente={lot.total_prix_revente}
          montantTaxe={lot.montant_taxe}
          nbArticles={lot.lignes.reduce((sum, l) => sum + l.quantite, 0)}
        />

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
                    <Link href={`/dossiers/${lot.dossier.id}`} target="_blank">
                      <ArrowSquareOut size={14} weight="duotone" className="text-muted-foreground hover:text-foreground transition-colors" />
                    </Link>
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
              <Link href={`/clients/${lot.dossier.client.id}`} target="_blank">
                <Button variant="secondary" size="sm">
                  <ArrowSquareOut size={14} weight="duotone" />
                  Voir le client
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <DetailRow label="Nom" value={clientName} />
              <DetailRow
                label="Validité"
                value={
                  <Badge
                    variant={lot.dossier.client.is_valid ? "default" : "destructive"}
                    className={lot.dossier.client.is_valid ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30" : ""}
                  >
                    {lot.dossier.client.is_valid ? "Valide" : "Non valide"}
                  </Badge>
                }
              />
              <DetailRow label="Téléphone" value={lot.dossier.client.phone ? <CopyableText value={lot.dossier.client.phone} /> : "—"} />
              <DetailRow label="Email" value={lot.dossier.client.email ? <CopyableText value={lot.dossier.client.email} /> : "—"} />
              <DetailRow label="Ville" value={lot.dossier.client.city ?? "—"} />
            </CardContent>
          </Card>
        </div>

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
                  />
                )
              )
            )}
          </CardContent>
        </Card>

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
                {savingNotes ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            ) : (
              !isTerminal && (
                <Button variant="ghost" size="icon-sm" onClick={() => setEditingNotes(true)}>
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
