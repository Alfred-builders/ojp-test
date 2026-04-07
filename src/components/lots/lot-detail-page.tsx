"use client";

import { useState, useEffect } from "react";
import { CopyableText } from "@/components/ui/copyable-text";
import Link from "next/link";
import { PreviewLink } from "@/components/preview/preview-link";
import { useRouter } from "next/navigation";
import { getSettingClient } from "@/lib/settings-client";
import {
  ArrowLeft,
  ArrowSquareOut,
  Package,
  User as PhUser,
  NotePencil,
  Plus,
  PencilSimple,
  FloppyDisk,
  Diamond,
  Coins,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { triggerEmail } from "@/lib/email/trigger";
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
import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { RetractationCard } from "@/components/lots/retractation-card";

import { LotStepper } from "@/components/lots/lot-stepper";
import { ReferenceCard } from "@/components/lots/reference-card";
import { ReferenceFormBijoux } from "@/components/lots/reference-form-bijoux";
import { ReferenceFormOrInvest } from "@/components/lots/reference-form-or-invest";

import { generateDocument } from "@/lib/pdf/pdf-actions";
import { DocumentsTable } from "@/components/documents/documents-table";
import { ReglementsCard } from "@/components/reglements/reglements-card";
import { detectPaymentsDue } from "@/lib/reglements/detect-payments-due";
import type { LotWithReferences, LotReference, RachatStatus } from "@/types/lot";
import { formatDate, formatTime } from "@/lib/format";
import type { Reglement } from "@/types/reglement";
import type { OrInvestissement } from "@/types/or-investissement";

interface LotDetailPageProps {
  lot: LotWithReferences & {
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
  orInvestCatalog: OrInvestissement[];
  typeLabel?: string;
  backHref?: string;
  documents?: import("@/types/document").DocumentRecord[];
  reglements?: Reglement[];
}

export function LotDetailPage({ lot, orInvestCatalog, typeLabel, documents = [], reglements = [] }: LotDetailPageProps) {
  const router = useRouter();
  const [showFormBijoux, setShowFormBijoux] = useState(false);
  const [showFormOrInvest, setShowFormOrInvest] = useState(false);
  const [editingRef, setEditingRef] = useState<LotReference | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lot.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retractationMs, setRetractationMs] = useState(48 * 3600_000);
  const [acomptePct, setAcomptePct] = useState(10);
  const [commissionDvPct, setCommissionDvPct] = useState(40);

  useEffect(() => {
    getSettingClient("business_rules").then((rules) => {
      if (rules) {
        setRetractationMs(rules.retractation_heures * 3600_000);
        setAcomptePct(rules.acompte_pct);
        if (rules.commission_dv_pct) setCommissionDvPct(rules.commission_dv_pct);
      }
    });
  }, []);

  const supabase = createClient();
  const isBrouillon = lot.status === "brouillon";
  const isTerminal = lot.status === "refuse" || lot.status === "retracte" || lot.status === "finalise";
  const isDepotVente = lot.type === "depot_vente";
  const isFinalisedDepotVente = isDepotVente && lot.status === "finalise";
  const clientName = `${lot.dossier.client.civility === "M" ? "M." : "Mme"} ${lot.dossier.client.first_name} ${lot.dossier.client.last_name}`;

  const paymentsDue = detectPaymentsDue({
    lot,
    lotReferences: lot.references,
    reglements,
    clientId: lot.dossier.client.id,
    acompte_pct: acomptePct,
  });

  // ── Devis accept/refuse handlers ──────────────────────────
  const [devisLoading, setDevisLoading] = useState(false);

  async function handleAccepterDevisLot() {
    setDevisLoading(true);
    const now = new Date();
    const retractEnd = new Date(now.getTime() + retractationMs);
    const { error: e1 } = await mutate(
      supabase
        .from("lot_references")
        .update({ status: "bloque" })
        .eq("lot_id", lot.id),
      "Erreur lors du blocage des références",
      "Statut du lot mis à jour"
    );
    if (e1) { setDevisLoading(false); return; }
    const { error: e2 } = await mutate(
      supabase.from("lots").update({
        status: "en_retractation",
        date_acceptation: now.toISOString(),
        date_fin_retractation: retractEnd.toISOString(),
      }).eq("id", lot.id),
      "Erreur lors de la mise à jour du lot",
      "Statut du lot mis à jour"
    );
    if (e2) { setDevisLoading(false); return; }
    triggerEmail({
      notification_type: "interne_devis_accepte",
      lot_id: lot.id,
      dossier_id: lot.dossier_id,
    });
    setDevisLoading(false);
    router.refresh();
  }

  async function handleRefuserDevisLot() {
    setDevisLoading(true);
    const { error } = await mutate(
      supabase.from("lots").update({ status: "refuse" }).eq("id", lot.id),
      "Erreur lors du refus du lot",
      "Statut du lot mis à jour"
    );
    if (error) { setDevisLoading(false); return; }
    setDevisLoading(false);
    router.refresh();
  }

  function documentRowActions(doc: import("@/types/document").DocumentRecord) {
    if (doc.type === "devis_rachat" && lot.status === "devis_envoye") {
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            disabled={devisLoading}
            onClick={() => handleAccepterDevisLot()}
          >
            <CheckCircle size={14} weight="duotone" />
            Accepter
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={devisLoading}
            onClick={() => handleRefuserDevisLot()}
          >
            <XCircle size={14} weight="duotone" />
            Refuser
          </Button>
        </div>
      );
    }
    return null;
  }

  async function handleDeleteReference(refId: string) {
    const supabase = createClient();
    const { error } = await mutate(
      supabase.from("lot_references").delete().eq("id", refId),
      "Erreur lors de la suppression de la référence",
      "Référence supprimée"
    );
    if (error) return;
    router.refresh();
  }

  async function handleRestituer(refId: string) {
    const supabase = createClient();
    // Find the reference to get its linked stock entry
    const ref = lot.references.find((r) => r.id === refId);

    // Update lot_reference status
    const { error: e1 } = await mutate(
      supabase
        .from("lot_references")
        .update({ status: "rendu_client" })
        .eq("id", refId),
      "Erreur lors de la restitution de la référence",
      "Référence mise à jour"
    );
    if (e1) return;

    // Also update the linked bijoux_stock entry
    if (ref?.destination_stock_id) {
      const { error: e2 } = await mutate(
        supabase
          .from("bijoux_stock")
          .update({ statut: "rendu_client" })
          .eq("id", ref.destination_stock_id),
        "Erreur lors de la mise à jour du stock",
        "Référence mise à jour"
      );
      if (e2) return;
    }

    router.refresh();
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    const supabase = createClient();
    const { error } = await mutate(
      supabase
        .from("lots")
        .update({ notes: notes || null })
        .eq("id", lot.id),
      "Erreur lors de l'enregistrement des notes",
      "Notes sauvegardées"
    );
    if (error) { setSavingNotes(false); return; }
    setSavingNotes(false);
    setEditingNotes(false);
    router.refresh();
  }

  async function checkAndFinalizeLot() {
    const supabase = createClient();
    // Re-fetch refs to check if all are terminal
    const { data: refs } = await supabase
      .from("lot_references")
      .select("status")
      .eq("lot_id", lot.id);

    const allTerminal = (refs ?? []).every(
      (r) => r.status === "finalise" || r.status === "devis_refuse" || r.status === "retracte"
    );

    if (allTerminal) {
      const { error: e1 } = await mutate(
        supabase
          .from("lots")
          .update({ status: "finalise", date_finalisation: new Date().toISOString() })
          .eq("id", lot.id),
        "Erreur lors de la finalisation du lot",
        "Référence mise à jour"
      );
      if (e1) return;

      // Check dossier
      const { data: allLots } = await supabase
        .from("lots")
        .select("status")
        .eq("dossier_id", lot.dossier_id);

      const allDone = (allLots ?? []).every(
        (l) => l.status === "finalise" || l.status === "termine"
      );

      if (allDone) {
        const { error: e2 } = await mutate(
          supabase
            .from("dossiers")
            .update({ status: "finalise" })
            .eq("id", lot.dossier_id),
          "Erreur lors de la finalisation du dossier",
          "Référence mise à jour"
        );
        if (e2) return;
      }
    }
  }

  async function handleValiderRachat(refId: string) {
    const supabase = createClient();
    const ref = lot.references.find((r) => r.id === refId);
    if (!ref || ref.categorie !== "bijoux") return;

    // Create bijoux_stock entry
    const { data: stockEntry, error: e1 } = await mutate(
      supabase
        .from("bijoux_stock")
        .insert({
          nom: ref.designation,
          metaux: ref.metal,
          qualite: ref.qualite,
          poids: ref.poids,
          prix_achat: ref.prix_achat,
          prix_revente: ref.prix_revente_estime,
          quantite: ref.quantite,
          statut: "en_stock",
        })
        .select("id")
        .single(),
      "Erreur lors de la création de l'entrée en stock",
      "Référence mise à jour"
    );
    if (e1) return;

    const { error: e2 } = await mutate(
      supabase
        .from("lot_references")
        .update({
          status: "finalise",
          destination_stock_id: stockEntry?.id ?? null,
        })
        .eq("id", refId),
      "Erreur lors de la finalisation de la référence",
      "Référence mise à jour"
    );
    if (e2) return;

    // Generate quittance de rachat for this validated ref
    const now = new Date();
    await generateDocument({
      type: "quittance_rachat",
      lotId: lot.id,
      dossierId: lot.dossier_id,
      clientId: lot.dossier.client.id,
      client: {
        civilite: lot.dossier.client.civility === "M" ? "M." : "Mme",
        nom: lot.dossier.client.last_name,
        prenom: lot.dossier.client.first_name,
        ville: lot.dossier.client.city ?? undefined,
      },
      dossier: {
        numeroDossier: lot.dossier.numero,
        numeroLot: lot.numero,
        date: formatDate(now.toISOString()),
        heure: formatTime(now),
      },
      references: [{
        designation: ref.designation,
        metal: ref.metal ?? "—",
        titrage: ref.qualite ?? "—",
        poids: ref.poids ?? 0,
        quantite: ref.quantite,
        taxe: ref.montant_taxe > 0 ? "11.5%" : "0%",
        prixUnitaire: ref.prix_achat,
        prixTotal: ref.prix_achat * ref.quantite,
      }],
      totaux: {
        totalBrut: ref.prix_achat * ref.quantite,
        taxe: ref.montant_taxe * ref.quantite,
        netAPayer: (ref.prix_achat - ref.montant_taxe) * ref.quantite,
      },
    });

    await checkAndFinalizeLot();
    router.refresh();
  }

  async function handleRetracter(refId: string) {
    const supabase = createClient();
    const { error } = await mutate(
      supabase
        .from("lot_references")
        .update({ status: "retracte" })
        .eq("id", refId),
      "Erreur lors de la rétractation de la référence",
      "Référence mise à jour"
    );
    if (error) return;

    await checkAndFinalizeLot();
    router.refresh();
  }

  async function handleAccepterDevis(refId: string) {
    const supabase = createClient();
    const ref = lot.references.find((r) => r.id === refId);
    if (!ref) return;

    if (ref.categorie === "or_investissement" && ref.or_investissement_id) {
      // Or invest devis accepté → stock immédiat
      const { error: e1 } = await mutate(
        supabase.rpc("increment_or_invest_quantite", {
          p_id: ref.or_investissement_id,
          p_qty: ref.quantite,
        }),
        "Erreur lors de l'incrémentation du stock or investissement",
        "Référence mise à jour"
      );
      if (e1) return;
      const { error: e2 } = await mutate(
        supabase
          .from("lot_references")
          .update({ status: "finalise" })
          .eq("id", refId),
        "Erreur lors de la finalisation de la référence",
        "Référence mise à jour"
      );
      if (e2) return;
    } else {
      // Bijoux devis accepté → en_retractation (nouveau 48h)
      const now = new Date();
      const delai = new Date(now.getTime() + retractationMs);
      const { error: e3 } = await mutate(
        supabase
          .from("lot_references")
          .update({
            status: "en_retractation",
            date_envoi: now.toISOString(),
            date_fin_delai: delai.toISOString(),
          })
          .eq("id", refId),
        "Erreur lors de la mise en rétractation de la référence",
        "Référence mise à jour"
      );
      if (e3) return;
    }

    await checkAndFinalizeLot();
    router.refresh();
  }

  async function handleRefuserDevis(refId: string) {
    const supabase = createClient();
    const { error } = await mutate(
      supabase
        .from("lot_references")
        .update({ status: "devis_refuse" })
        .eq("id", refId),
      "Erreur lors du refus du devis",
      "Référence mise à jour"
    );
    if (error) return;

    await checkAndFinalizeLot();
    router.refresh();
  }

  return (
    <>
      <Header
        title={lot.numero}
        backAction={
          <Link href="/lots">
            <Button variant="ghost" size="icon-sm" aria-label="Retour">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <div className="flex items-center gap-2">
          <LotStatusBadge status={lot.status as RachatStatus} />
          {lot.status === "brouillon" && (
            <Button
              size="sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const { error } = await mutate(
                  supabase.from("lots").update({ updated_at: new Date().toISOString() }).eq("id", lot.id),
                  "Erreur lors de l'enregistrement du lot",
                  "Référence mise à jour"
                );
                setSaving(false);
                if (error) return;
                router.push(`/dossiers/${lot.dossier_id}`);
              }}
            >
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
        </div>
      </Header>

      <div className="flex-1 p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Lot info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package size={20} weight="duotone" />
                Informations du lot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DetailRow label="Numéro" value={lot.numero} />
              <DetailRow label="Type" value={typeLabel ?? "Rachat"} />
              <DetailRow label="Dossier" value={
                <span className="inline-flex items-center gap-1.5">
                  {lot.dossier.numero}
                  <PreviewLink entityType="dossier" entityId={lot.dossier.id} href={`/dossiers/${lot.dossier.id}`}>
                    <ArrowSquareOut size={14} weight="duotone" className="text-muted-foreground hover:text-foreground transition-colors" />
                  </PreviewLink>
                </span>
              } />
              <DetailRow label="Date de création" value={formatDate(lot.created_at)} />
              {lot.date_acceptation && (
                <DetailRow label="Date d'acceptation" value={formatDate(lot.date_acceptation)} />
              )}
              {lot.date_finalisation && (
                <DetailRow label="Date de finalisation" value={formatDate(lot.date_finalisation)} />
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
          lotType={lot.type as "rachat" | "depot_vente"}
          lotStatus={lot.status}
          hasDevis={lot.references.some((r) => r.type_rachat === "devis")}
          allRefsTerminal={lot.references.length > 0 && lot.references.every((r) =>
            ["finalise", "retracte", "devis_refuse", "vendu", "rendu_client"].includes(r.status)
          )}
          isError={lot.status === "retracte" || lot.status === "refuse"}
          referenceStatuses={lot.references.map((r) => r.status)}
        />

        {/* Retractation card */}
        {lot.status === "en_retractation" && (
          <RetractationCard lot={lot} />
        )}

        {/* References section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package size={20} weight="duotone" />
              Références ({lot.references.length})
            </CardTitle>
            {isBrouillon && (
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
                  <DropdownMenuItem
                    onClick={() => { setShowFormBijoux(true); setShowFormOrInvest(false); }}
                  >
                    <Diamond size={16} weight="duotone" />
                    Bijou
                  </DropdownMenuItem>
                  {!isDepotVente && (
                    <DropdownMenuItem
                      onClick={() => { setShowFormOrInvest(true); setShowFormBijoux(false); }}
                    >
                      <Coins size={16} weight="duotone" />
                      Or Investissement
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {showFormBijoux && (
              <ReferenceFormBijoux
                lotId={lot.id}
                coursOrSnapshot={lot.cours_or_snapshot ?? 0}
                coursArgentSnapshot={lot.cours_argent_snapshot ?? 0}
                coursPlatineSnapshot={lot.cours_platine_snapshot ?? 0}
                coefficientSnapshot={lot.coefficient_rachat_snapshot ?? 0}
                coefficientVenteSnapshot={lot.coefficient_vente_snapshot ?? 0}
                onClose={() => setShowFormBijoux(false)}
                lotType={isDepotVente ? "depot_vente" : "rachat"}
                commissionDvPct={commissionDvPct}
              />
            )}
            {showFormOrInvest && (
              <ReferenceFormOrInvest
                lotId={lot.id}
                coursOrSnapshot={lot.cours_or_snapshot ?? 0}
                coursArgentSnapshot={lot.cours_argent_snapshot ?? 0}
                coursPlatineSnapshot={lot.cours_platine_snapshot ?? 0}
                coefficientRachatSnapshot={lot.coefficient_rachat_snapshot ?? 0}
                coefficientVenteSnapshot={lot.coefficient_vente_snapshot ?? 0}
                catalog={orInvestCatalog}
                onClose={() => setShowFormOrInvest(false)}
              />
            )}
            {lot.references.length === 0 && !showFormBijoux && !showFormOrInvest ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune référence. Ajoutez des bijoux ou de l&apos;or investissement.
              </p>
            ) : (
              lot.references.map((ref) => (
                editingRef?.id === ref.id ? (
                  ref.categorie === "bijoux" ? (
                    <ReferenceFormBijoux
                      key={ref.id}
                      lotId={lot.id}
                      coursOrSnapshot={lot.cours_or_snapshot ?? 0}
                      coursArgentSnapshot={lot.cours_argent_snapshot ?? 0}
                      coursPlatineSnapshot={lot.cours_platine_snapshot ?? 0}
                      coefficientSnapshot={lot.coefficient_rachat_snapshot ?? 0}
                      coefficientVenteSnapshot={lot.coefficient_vente_snapshot ?? 0}
                      onClose={() => setEditingRef(null)}
                      editData={ref}
                      lotType={isDepotVente ? "depot_vente" : "rachat"}
                    />
                  ) : (
                    <ReferenceFormOrInvest
                      key={ref.id}
                      lotId={lot.id}
                      coursOrSnapshot={lot.cours_or_snapshot ?? 0}
                      coursArgentSnapshot={lot.cours_argent_snapshot ?? 0}
                      coursPlatineSnapshot={lot.cours_platine_snapshot ?? 0}
                      coefficientRachatSnapshot={lot.coefficient_rachat_snapshot ?? 0}
                      coefficientVenteSnapshot={lot.coefficient_vente_snapshot ?? 0}
                      catalog={orInvestCatalog}
                      onClose={() => setEditingRef(null)}
                      editData={ref}
                    />
                  )
                ) : (
                <ReferenceCard
                  key={ref.id}
                  reference={ref}
                  onDelete={handleDeleteReference}
                  onEdit={(r) => setEditingRef(r)}
                  canEdit={isBrouillon}
                  onRestituer={handleRestituer}
                  canRestituer={isFinalisedDepotVente}
                  hideTypeRachat={isDepotVente}
                  onValiderRachat={handleValiderRachat}
                  onRetracter={handleRetracter}
                  onAccepterDevis={handleAccepterDevis}
                  onRefuserDevis={handleRefuserDevis}
                />
                )
              ))
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <DocumentsTable documents={documents} rowActions={documentRowActions} />

        {/* Reglements */}
        {(lot.type === "rachat" || lot.type === "depot_vente") && lot.status !== "brouillon" && (
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
                placeholder="Notes sur le lot..."
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
