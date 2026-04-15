"use client";

import { useState } from "react";
import { CopyableText } from "@/components/ui/copyable-text";
import Link from "next/link";
import { PreviewLink } from "@/components/preview/preview-link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  FolderOpen as PhFolderOpen,
  NotePencil as PhNotePencil,
  User as PhUser,
  PencilSimple,
  FloppyDisk,
  CheckCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
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
import { Header } from "@/components/dashboard/header";
import { DOSSIER_STATUS_OPTIONS } from "@/lib/validations/dossier";
import { DocumentsTable } from "@/components/documents/documents-table";
import { DossierRecapFinancier } from "@/components/dossiers/dossier-recap-financier";
import { DossierLotsSection } from "@/components/dossiers/dossier-lots-section";
import { ActionDashboard } from "@/components/actions/action-dashboard";
import { finaliserDossierAction } from "@/lib/actions/finalize-actions";
import type { DossierWithClient, DossierStatus } from "@/types/dossier";
import type { Lot, LotReference, LotWithReferences } from "@/types/lot";
import type { VenteLigne } from "@/types/vente";
import type { Parametres } from "@/types/parametres";
import { formatDate } from "@/lib/format";
import type { Reglement } from "@/types/reglement";

function DetailRow({
  label,
  value,
  editing,
  editValue,
  onEditChange,
  type = "text",
  editContent,
  noBorder,
}: {
  label: string;
  value: React.ReactNode;
  editing?: boolean;
  editValue?: string;
  onEditChange?: (val: string) => void;
  type?: string;
  editContent?: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${noBorder ? "" : "border-b last:border-0"}`}>
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

export function DossierDetailPage({
  dossier,
  lots,
  parametres,
  documents,
  reglements = [],
  venteLignes = [],
  lotReferences = [],
  bonsCommande = [],
  stockCostMap = {},
}: {
  dossier: DossierWithClient;
  lots: Lot[];
  parametres: Parametres;
  documents?: import("@/types/document").DocumentWithRefs[];
  reglements?: Reglement[];
  venteLignes?: VenteLigne[];
  lotReferences?: LotReference[];
  bonsCommande?: import("@/types/bon-commande").BonCommande[];
  stockCostMap?: Record<string, number>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingLot, setCreatingLot] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [status, setStatus] = useState(dossier.status);
  const [notes, setNotes] = useState(dossier.notes ?? "");

  // Lots that can be finalized (brouillon)
  const brouillonLots = lots.filter((l) => l.status === "brouillon");
  const canFinalize = brouillonLots.length > 0;

  // Build LotWithReferences for ActionDashboard
  const lotsWithRefs: LotWithReferences[] = lots.map((lot) => ({
    ...lot,
    references: lotReferences.filter((r) => r.lot_id === lot.id),
  }));

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    // Save notes
    const { error } = await supabase
      .from("dossiers")
      .update({
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dossier.id);

    if (error) { setSaving(false); toast.error("Erreur lors de l'enregistrement du dossier"); return; }

    // If transitioning to en_cours, trigger full finalization via server action
    if (dossier.status === "brouillon" && status === "en_cours") {
      try {
        const result = await finaliserDossierAction(dossier.id);
        if (!result.success) {
          toast.error(result.error ?? "Erreur lors de la finalisation");
          setSaving(false);
          router.refresh();
          return;
        }
      } catch (err) {
        console.error("[DOSSIER] finaliserDossierAction error:", err);
        toast.error("Erreur inattendue lors de la finalisation");
        setSaving(false);
        router.refresh();
        return;
      }
    } else if (status !== dossier.status) {
      // Simple status change (not finalization)
      const { error: statusErr } = await supabase
        .from("dossiers")
        .update({ status })
        .eq("id", dossier.id);
      if (statusErr) { setSaving(false); toast.error("Erreur lors du changement de statut"); return; }
    }

    setSaving(false);
    toast.success("Dossier mis à jour");
    setEditing(false);
    setEditingNotes(false);
    router.refresh();
  }

  async function handleSaveNotes() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("dossiers")
      .update({
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dossier.id);
    setSaving(false);
    if (error) { toast.error("Erreur lors de l'enregistrement des notes"); return; }
    toast.success("Notes sauvegardées");
    setEditingNotes(false);
    router.refresh();
  }

  async function handleCreateLot(type: "rachat" | "vente" | "depot_vente") {
    if (dossier.status !== "brouillon") {
      toast.error("Impossible d'ajouter un lot à un dossier validé. Veuillez créer un nouveau dossier.");
      return;
    }
    setCreatingLot(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: lot, error } = await supabase
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
    if (error) { console.error("Lot creation error:", error); toast.error(`Erreur lors de la création du lot : ${error.message}`); return; }
    toast.success("Lot ajouté");
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
    const { error } = await supabase.from("lots").delete().eq("id", lotId);
    if (error) { toast.error("Erreur lors de la suppression du lot"); return; }
    toast.success("Lot supprimé");
    router.refresh();
  }

  async function handleFinaliserDossier() {
    setProcessing(true);
    try {
      const result = await finaliserDossierAction(dossier.id);
      setProcessing(false);
      if (result.success) {
        toast.success("Dossier finalisé");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de la finalisation du dossier");
      }
    } catch (err) {
      setProcessing(false);
      console.error("[DOSSIER] handleFinaliserDossier error:", err);
      toast.error("Erreur inattendue lors de la finalisation");
    }
  }

  const clientName = `${dossier.client.civility === "M" ? "M." : "Mme"} ${dossier.client.first_name} ${dossier.client.last_name}`;

  return (
    <>
      <Header
        title={
          <span className="inline-flex items-center gap-2">
            {dossier.numero}
            {!editing && (
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
            )}
          </span>
        }
        backAction={
          <Button variant="ghost" size="icon-sm" aria-label="Retour" onClick={() => router.back()}>
            <ArrowLeft size={16} weight="regular" />
          </Button>
        }
      >
        <div className="flex items-center gap-2">
          {editing && status !== "finalise" && (
            <Select value={status} onValueChange={(val) => { if (val) setStatus(val as DossierStatus); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOSSIER_STATUS_OPTIONS
                  .filter((opt) => {
                    // Only show valid transitions from current dossier status
                    if (dossier.status === "brouillon") return opt.value === "brouillon" || opt.value === "en_cours";
                    if (dossier.status === "en_cours") return opt.value === "en_cours" || opt.value === "finalise";
                    return false;
                  })
                  .map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {editing ? (
            <Button size="sm" disabled={saving} onClick={handleSave}>
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Enregistrement..." : "Enregistrer"}
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
              <PreviewLink entityType="client" entityId={dossier.client.id} href={`/clients/${dossier.client.id}`}>
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
                    variant={dossier.client.is_valid ? "default" : "destructive"}
                    className={dossier.client.is_valid ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30" : ""}
                  >
                    {dossier.client.is_valid ? "Valide" : "Non valide"}
                  </Badge>
                </span>
              } />
              <DetailRow label="Téléphone" value={dossier.client.phone ? <CopyableText value={dossier.client.phone} /> : "—"} />
              <DetailRow label="Email" value={dossier.client.email ? <CopyableText value={dossier.client.email} /> : "—"} />
              <DetailRow label="Ville" value={dossier.client.city ?? "—"} />
            </CardContent>
          </Card>

          {/* Action Dashboard */}
          <ActionDashboard
            dossier={dossier}
            lots={lotsWithRefs}
            documents={documents ?? []}
            reglements={reglements}
            venteLignes={venteLignes}
            bonsCommande={bonsCommande}
          />

          {/* Lots */}
          <DossierLotsSection
            lots={lots}
            dossierStatus={dossier.status}
            creatingLot={creatingLot}
            onCreateLot={handleCreateLot}
            onDeleteLot={handleDeleteLot}
          />

          {/* Documents */}
          <div className="md:col-span-2">
            <DocumentsTable documents={documents ?? []} />
          </div>

          {/* Récapitulatif financier — masqué temporairement */}
          {/* <DossierRecapFinancier
            lots={lots}
            lotReferences={lotReferences}
            venteLignes={venteLignes}
            reglements={reglements}
            bonsCommande={bonsCommande}
            documents={documents ?? []}
            stockCostMap={stockCostMap}
          /> */}

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
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              ) : (
                <Button variant="ghost" size="icon-sm" onClick={() => setEditingNotes(true)} aria-label="Modifier les notes">
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
