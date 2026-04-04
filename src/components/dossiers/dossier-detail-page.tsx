"use client";

import { useState } from "react";
import { CopyableText } from "@/components/ui/copyable-text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  FolderOpen as PhFolderOpen,
  NotePencil as PhNotePencil,
  User as PhUser,
  PencilSimple,
  FloppyDisk,
  Package,
  Plus,
  ShoppingCart,
  Storefront,
  HandCoins,
  DotsThree,
  Eye,
  Trash,
  WarningCircle,
  Scales,
  CaretDown,
  CheckCircle,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Header } from "@/components/dashboard/header";
import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { VenteStatusBadge } from "@/components/ventes/vente-status-badge";
import { DOSSIER_STATUS_OPTIONS } from "@/lib/validations/dossier";
import type { DossierWithClient, DossierStatus } from "@/types/dossier";
import type { Lot, RachatStatus } from "@/types/lot";
import type { VenteStatus } from "@/types/vente";
import type { Parametres } from "@/types/parametres";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function DetailRow({
  label,
  value,
  editing,
  editValue,
  onEditChange,
  type = "text",
  editContent,
}: {
  label: string;
  value: React.ReactNode;
  editing?: boolean;
  editValue?: string;
  onEditChange?: (val: string) => void;
  type?: string;
  editContent?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {editing && editContent ? (
        editContent
      ) : editing && onEditChange ? (
        <Input
          type={type}
          value={editValue ?? ""}
          onChange={(e) => onEditChange(e.target.value)}
          className="w-48"
        />
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export function DossierDetailPage({
  dossier,
  lots,
  parametres,
}: {
  dossier: DossierWithClient;
  lots: Lot[];
  parametres: Parametres;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingLot, setCreatingLot] = useState(false);
  const [deletingLotId, setDeletingLotId] = useState<string | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [status, setStatus] = useState(dossier.status);
  const [notes, setNotes] = useState(dossier.notes ?? "");

  // Lots that can be finalized (brouillon)
  const brouillonLots = lots.filter((l) => l.status === "brouillon");
  const canFinalize = brouillonLots.length > 0;

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("dossiers")
      .update({
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dossier.id);
    setSaving(false);
    setEditing(false);
    setEditingNotes(false);
    router.refresh();
  }

  async function handleSaveNotes() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("dossiers")
      .update({
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dossier.id);
    setSaving(false);
    setEditingNotes(false);
    router.refresh();
  }

  async function handleCreateLot(type: "rachat" | "vente" | "depot_vente") {
    setCreatingLot(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: lot } = await supabase
      .from("lots")
      .insert({
        numero: "",
        dossier_id: dossier.id,
        type,
        status: "brouillon",
        cours_or_snapshot: parametres.prix_or,
        cours_argent_snapshot: parametres.prix_argent,
        cours_platine_snapshot: parametres.prix_platine,
        coefficient_rachat_snapshot: parametres.coefficient_rachat,
        coefficient_vente_snapshot: parametres.coefficient_vente,
        created_by: user!.id,
      })
      .select("id")
      .single();

    setCreatingLot(false);
    if (lot) {
      router.push(
        type === "vente" ? `/ventes/${lot.id}`
        : type === "depot_vente" ? `/depot-vente/${lot.id}`
        : `/lots/${lot.id}`
      );
    }
  }

  async function handleDeleteLot(lotId: string) {
    const supabase = createClient();
    await supabase.from("lots").delete().eq("id", lotId);
    setDeletingLotId(null);
    router.refresh();
  }

  async function handleFinaliserDossier() {
    setProcessing(true);
    const supabase = createClient();

    const now = new Date();
    const delai48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    for (const lot of brouillonLots) {
      if (lot.type === "rachat") {
        // Fetch references for this lot
        const { data: refs } = await supabase
          .from("lot_references")
          .select("*")
          .eq("lot_id", lot.id);

        let allImmediate = true;

        for (const ref of refs ?? []) {
          if (ref.type_rachat === "devis") {
            // Devis: 48h pour accepter
            await supabase
              .from("lot_references")
              .update({
                status: "devis_envoye",
                date_envoi: now.toISOString(),
                date_fin_delai: delai48h.toISOString(),
              })
              .eq("id", ref.id);
            allImmediate = false;
          } else if (ref.categorie === "bijoux" && ref.type_rachat === "direct") {
            // Bijoux direct: contrat rachat → 48h rétractation
            await supabase
              .from("lot_references")
              .update({
                status: "en_retractation",
                date_envoi: now.toISOString(),
                date_fin_delai: delai48h.toISOString(),
              })
              .eq("id", ref.id);
            allImmediate = false;
          } else if (ref.categorie === "or_investissement" && ref.type_rachat === "direct") {
            // Or invest direct: stock immédiat
            await supabase.rpc("increment_or_invest_quantite", {
              p_id: ref.or_investissement_id,
              p_qty: ref.quantite,
            });
            await supabase
              .from("lot_references")
              .update({ status: "finalise" })
              .eq("id", ref.id);
          }
        }

        // If all refs were immediate (only or invest direct), finalize lot
        if (allImmediate) {
          await supabase
            .from("lots")
            .update({ status: "finalise", date_finalisation: now.toISOString() })
            .eq("id", lot.id);
        } else {
          await supabase
            .from("lots")
            .update({ status: "en_cours" })
            .eq("id", lot.id);
        }
        continue;
      }

      if (lot.type === "depot_vente") {
        // Depot-vente: all bijoux go to stock with en_depot_vente
        const { data: refs } = await supabase
          .from("lot_references")
          .select("*")
          .eq("lot_id", lot.id);

        for (const ref of refs ?? []) {
          if (ref.categorie === "bijoux") {
            const { data: stockEntry } = await supabase
              .from("bijoux_stock")
              .insert({
                nom: ref.designation,
                metaux: ref.metal,
                qualite: ref.qualite,
                poids: ref.poids,
                prix_achat: ref.prix_achat,
                prix_revente: ref.prix_revente_estime,
                quantite: ref.quantite,
                statut: "en_depot_vente",
                depot_vente_lot_id: lot.id,
                deposant_client_id: dossier.client.id,
              })
              .select("id")
              .single();

            if (stockEntry) {
              await supabase
                .from("lot_references")
                .update({ status: "en_depot_vente", destination_stock_id: stockEntry.id })
                .eq("id", ref.id);
            }
          }
        }

        await supabase
          .from("lots")
          .update({ status: "finalise", date_finalisation: now.toISOString() })
          .eq("id", lot.id);
        continue;
      }

      if (lot.type === "vente") {
        // Fetch vente lignes
        const { data: lignes } = await supabase
          .from("vente_lignes")
          .select("*")
          .eq("lot_id", lot.id);

        const hasOrInvestPending = (lignes ?? []).some(
          (l) => l.or_investissement_id && l.fulfillment !== "servi_stock" && l.fulfillment !== "recu"
        );

        // Mark bijoux stock as vendu
        for (const ligne of lignes ?? []) {
          if (ligne.bijoux_stock_id) {
            await supabase
              .from("bijoux_stock")
              .update({ statut: "vendu" })
              .eq("id", ligne.bijoux_stock_id);
          }
        }

        if (hasOrInvestPending) {
          await supabase
            .from("lots")
            .update({ status: "en_cours" })
            .eq("id", lot.id);
          continue;
        }

        await supabase
          .from("lots")
          .update({ status: "termine", date_finalisation: now.toISOString() })
          .eq("id", lot.id);
        continue;
      }
    }

    // Check if ALL lots are now finalized/terminated to update dossier
    const { data: updatedLots } = await supabase
      .from("lots")
      .select("status")
      .eq("dossier_id", dossier.id);

    const allDone = (updatedLots ?? []).every(
      (l) => l.status === "finalise" || l.status === "termine"
    );

    await supabase
      .from("dossiers")
      .update({ status: allDone ? "finalise" : "en_cours" })
      .eq("id", dossier.id);

    setProcessing(false);
    router.refresh();
  }

  const clientName = `${dossier.client.civility === "M" ? "M." : "Mme"} ${dossier.client.first_name} ${dossier.client.last_name}`;

  return (
    <>
      <Header
        title={dossier.numero}
        backAction={
          <Link href="/dossiers">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <div className="flex items-center gap-2">
          {editing ? (
            <Button size="sm" disabled={saving} onClick={handleSave}>
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <PencilSimple size={16} weight="duotone" />
              Modifier
            </Button>
          )}
          {canFinalize && (
            <Button size="sm" disabled={processing} onClick={handleFinaliserDossier}>
              <CheckCircle size={16} weight="duotone" />
              {processing ? "Traitement..." : "Finaliser le dossier"}
            </Button>
          )}
        </div>
      </Header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Informations du dossier */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhFolderOpen size={20} weight="duotone" />
                Informations du dossier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Numéro" value={dossier.numero} />
              <DetailRow
                label="Statut"
                value={
                  <Badge
                    variant="secondary"
                    className={
                      dossier.status === "finalise"
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                        : dossier.status === "en_cours"
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                    }
                  >
                    {dossier.status === "finalise" ? "Finalisé" : dossier.status === "en_cours" ? "En cours" : "Brouillon"}
                  </Badge>
                }
                editing={editing}
                editContent={
                  <Select value={status} onValueChange={(val) => { if (val) setStatus(val as DossierStatus); }}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOSSIER_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <DetailRow label="Date de création" value={formatDate(dossier.created_at)} />
              <DetailRow label="Dernière modification" value={formatDate(dossier.updated_at)} />
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PhUser size={20} weight="duotone" />
                Client
              </CardTitle>
              <Link href={`/clients/${dossier.client.id}`} target="_blank">
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
                    variant={dossier.client.is_valid ? "default" : "destructive"}
                    className={dossier.client.is_valid ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30" : ""}
                  >
                    {dossier.client.is_valid ? "Valide" : "Non valide"}
                  </Badge>
                }
              />
              <DetailRow label="Téléphone" value={dossier.client.phone ? <CopyableText value={dossier.client.phone} /> : "—"} />
              <DetailRow label="Email" value={dossier.client.email ? <CopyableText value={dossier.client.email} /> : "—"} />
              <DetailRow label="Ville" value={dossier.client.city ?? "—"} />
            </CardContent>
          </Card>

          {/* Lots */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package size={20} weight="duotone" />
                Lots ({lots.length})
              </CardTitle>
              {dossier.status !== "finalise" && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button size="sm" variant="secondary" disabled={creatingLot}>
                        <Plus size={14} weight="bold" />
                        {creatingLot ? "Création..." : "Nouveau lot"}
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleCreateLot("rachat")}>
                      <ShoppingCart size={16} weight="duotone" />
                      Rachat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCreateLot("vente")}>
                      <Storefront size={16} weight="duotone" />
                      Vente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCreateLot("depot_vente")}>
                      <HandCoins size={16} weight="duotone" />
                      Dépôt-vente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardHeader>
            <CardContent>
              {lots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aucun lot pour ce dossier.
                </p>
              ) : (
                <div className="space-y-2">
                  {lots.map((lot) => (
                    <div
                      key={lot.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => router.push(lot.type === "vente" ? `/ventes/${lot.id}` : lot.type === "depot_vente" ? `/depot-vente/${lot.id}` : `/lots/${lot.id}`)}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                          {lot.type === "vente" ? (
                            <Storefront size={16} weight="duotone" className="text-muted-foreground" />
                          ) : lot.type === "depot_vente" ? (
                            <HandCoins size={16} weight="duotone" className="text-muted-foreground" />
                          ) : (
                            <ShoppingCart size={16} weight="duotone" className="text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{lot.numero}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {lot.type === "vente" ? "Vente" : lot.type === "depot_vente" ? "Dépôt-vente" : "Rachat"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(lot.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatCurrency(lot.type === "vente" || lot.type === "depot_vente" ? lot.total_prix_revente : lot.total_prix_achat)}
                        </span>
                        {lot.type === "vente" ? (
                          <VenteStatusBadge status={lot.status as VenteStatus} />
                        ) : (
                          <LotStatusBadge status={lot.status as RachatStatus} />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-xs" />}
                          >
                            <DotsThree size={16} weight="bold" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(
                              lot.type === "vente" ? `/ventes/${lot.id}`
                              : lot.type === "depot_vente" ? `/depot-vente/${lot.id}`
                              : `/lots/${lot.id}`
                            )}>
                              <Eye size={14} weight="duotone" />
                              Voir le lot
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeletingLotId(lot.id)}
                            >
                              <Trash size={14} weight="duotone" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}

                  {/* Dialog de confirmation suppression lot */}
                  <Dialog open={!!deletingLotId} onOpenChange={(open) => { if (!open) setDeletingLotId(null); }}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <WarningCircle size={20} weight="duotone" className="text-destructive" />
                          Supprimer le lot
                        </DialogTitle>
                        <DialogDescription>
                          Êtes-vous sûr de vouloir supprimer ce lot et toutes ses références ? Cette action est irréversible.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setDeletingLotId(null)}>
                          Annuler
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletingLotId && handleDeleteLot(deletingLotId)}
                        >
                          <Trash size={14} weight="duotone" />
                          Supprimer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Récapitulatif financier */}
          {lots.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setRecapOpen((o) => !o)}
              >
                <CardTitle className="flex items-center gap-2">
                  <Scales size={20} weight="duotone" />
                  Récapitulatif financier
                  <CaretDown
                    size={16}
                    weight="bold"
                    className={`ml-auto text-muted-foreground transition-transform ${recapOpen ? "rotate-180" : ""}`}
                  />
                </CardTitle>
              </CardHeader>
              {recapOpen && <CardContent className="space-y-5">
                {(() => {
                  const rachatLots = lots.filter((l) => l.type === "rachat");
                  const venteLots = lots.filter((l) => l.type === "vente");
                  const depotVenteLots = lots.filter((l) => l.type === "depot_vente");

                  const totalRachats = rachatLots.reduce((sum, l) => sum + l.total_prix_achat, 0);
                  const totalRachatsTaxes = rachatLots.reduce((sum, l) => sum + l.montant_taxe, 0);
                  const totalRachatsNet = rachatLots.reduce((sum, l) => sum + l.montant_net, 0);
                  const totalVentes = venteLots.reduce((sum, l) => sum + l.total_prix_revente, 0);
                  const totalVentesTaxes = venteLots.reduce((sum, l) => sum + l.montant_taxe, 0);
                  const totalDepotVenteRevente = depotVenteLots.reduce((sum, l) => sum + l.total_prix_revente, 0);
                  const totalDepotVenteRachat = depotVenteLots.reduce((sum, l) => sum + l.total_prix_achat, 0);
                  const totalCommission = totalDepotVenteRevente - totalDepotVenteRachat;

                  const solde = totalVentes - totalRachats;

                  return (
                    <>
                      {/* Rachats */}
                      {rachatLots.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Rachats</p>
                          <div className="space-y-1.5">
                            {rachatLots.map((l) => (
                              <div key={l.id}>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground truncate">{l.numero}</span>
                                  <span className="font-medium text-red-600 dark:text-red-400">- {formatCurrency(l.total_prix_achat)}</span>
                                </div>
                                {(l.montant_taxe > 0 || l.montant_net > 0) && (
                                  <p className="text-xs text-muted-foreground">
                                    Taxes : {formatCurrency(l.montant_taxe)} · Net : {formatCurrency(l.montant_net)} · Marge : {formatCurrency(l.marge_brute)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t space-y-0.5">
                            <div className="flex items-center justify-between text-sm font-semibold">
                              <span>Total rachats brut</span>
                              <span className="text-red-600 dark:text-red-400">- {formatCurrency(totalRachats)}</span>
                            </div>
                            {totalRachatsTaxes > 0 && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Dont taxes</span>
                                <span>{formatCurrency(totalRachatsTaxes)}</span>
                              </div>
                            )}
                            {totalRachatsNet > 0 && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Net à payer</span>
                                <span>{formatCurrency(totalRachatsNet)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dépôts-vente */}
                      {depotVenteLots.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Dépôts-vente</p>
                          <div className="space-y-1.5">
                            {depotVenteLots.map((l) => {
                              const commission = l.total_prix_revente - l.total_prix_achat;
                              return (
                                <div key={l.id}>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground truncate">{l.numero}</span>
                                    <span className="font-medium text-cyan-600 dark:text-cyan-400">+ {formatCurrency(commission)}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground ml-0">
                                    Revente : {formatCurrency(l.total_prix_revente)} · Reversé client : {formatCurrency(l.total_prix_achat)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between text-sm font-semibold mt-2 pt-2 border-t">
                            <span>Commission totale (40%)</span>
                            <span className="text-cyan-600 dark:text-cyan-400">+ {formatCurrency(totalCommission)}</span>
                          </div>
                        </div>
                      )}

                      {/* Ventes */}
                      {venteLots.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ventes</p>
                          <div className="space-y-1.5">
                            {venteLots.map((l) => (
                              <div key={l.id}>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground truncate">{l.numero}</span>
                                  <span className="font-medium text-emerald-600 dark:text-emerald-400">+ {formatCurrency(l.total_prix_revente)}</span>
                                </div>
                                {l.montant_taxe > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Taxes (TFOP) : {formatCurrency(l.montant_taxe)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t space-y-0.5">
                            <div className="flex items-center justify-between text-sm font-semibold">
                              <span>Total ventes</span>
                              <span className="text-emerald-600 dark:text-emerald-400">+ {formatCurrency(totalVentes)}</span>
                            </div>
                            {totalVentesTaxes > 0 && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Dont taxes (TFOP)</span>
                                <span>{formatCurrency(totalVentesTaxes)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Solde net */}
                      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Solde net (ventes - rachats)</span>
                          <span className={`text-lg font-bold ${solde >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {solde >= 0 ? "+" : ""} {formatCurrency(solde)}
                          </span>
                        </div>
                        {totalCommission > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Commission dépôt-vente</span>
                            <span className="font-medium text-cyan-600 dark:text-cyan-400">+ {formatCurrency(totalCommission)}</span>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </CardContent>}
            </Card>
          )}

          {/* Notes */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PhNotePencil size={20} weight="duotone" />
                Notes
              </CardTitle>
              {editing || editingNotes ? (
                <Button variant="secondary" size="sm" disabled={saving} onClick={editing ? handleSave : handleSaveNotes}>
                  <FloppyDisk size={14} weight="duotone" />
                  {saving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              ) : (
                <Button variant="ghost" size="icon-sm" onClick={() => setEditingNotes(true)}>
                  <PencilSimple size={16} weight="duotone" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editing || editingNotes ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes sur le dossier..."
                  className="min-h-[150px] resize-none"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {dossier.notes ?? "Aucune note."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
