"use client";

import { useState, useEffect, useRef } from "react";
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
  Receipt,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
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
import { RetractationTimer } from "@/components/actions/retractation-timer";
import { LotActionsCard } from "@/components/actions/lot-actions-card";

import { LotStepper } from "@/components/lots/lot-stepper";
import { ReferenceCard } from "@/components/lots/reference-card";
import { ReferenceFormBijoux } from "@/components/lots/reference-form-bijoux";
import { ReferenceFormOrInvest } from "@/components/lots/reference-form-or-invest";

import { DocumentsTable } from "@/components/documents/documents-table";
import { ReglementsCard } from "@/components/reglements/reglements-card";
import { detectPaymentsDue } from "@/lib/reglements/detect-payments-due";
import { getAvailableActions } from "@/lib/actions/action-registry";
import { executeAction } from "@/lib/actions/action-executor";
import type { ActionContext } from "@/lib/actions/action-types";
import type { LotWithReferences, LotReference, LotStatus } from "@/types/lot";
import { formatDate, formatCurrency } from "@/lib/format";
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

  // Track latest values in refs for cleanup on navigation away
  const refsCountRef = useRef(lot.references.length);
  const statusRef = useRef(lot.status);
  useEffect(() => {
    refsCountRef.current = lot.references.length;
    statusRef.current = lot.status;
  });

  // Auto-delete empty brouillon lot when navigating away (not on strict-mode remount)
  useEffect(() => {
    const lotId = lot.id;

    function cleanupIfEmpty() {
      if (statusRef.current === "brouillon" && refsCountRef.current === 0) {
        const sb = createClient();
        sb.from("lots").delete().eq("id", lotId).then(() => {});
      }
    }

    const handleBeforeUnload = () => cleanupIfEmpty();
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Listen for Next.js client-side navigation via popstate
    const handlePopState = () => cleanupIfEmpty();
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [lot.id]);

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
  const isTerminal = lot.status === "finalise";
  const isDepotVente = lot.type === "depot_vente";
  const clientName = `${lot.dossier.client.civility === "M" ? "M." : "Mme"} ${lot.dossier.client.first_name} ${lot.dossier.client.last_name}`;

  const paymentsDue = detectPaymentsDue({
    lot,
    lotReferences: lot.references,
    reglements,
    documents,
    clientId: lot.dossier.client.id,
    acompte_pct: acomptePct,
  });

  // ── Action context (used by ActionList) ─────────────────────
  const actionCtx: ActionContext = {
    lot,
    dossier: {
      id: lot.dossier.id,
      numero: lot.dossier.numero,
      client: lot.dossier.client,
    },
    retractationMs,
  };

  const availableActions = getAvailableActions({ lot, documents, paymentsDue });

  // ── Reference-level action handlers (delegated to action engine) ──
  async function handleRefAction(actionId: "ref.valider_rachat" | "ref.retracter" | "ref.accepter_devis" | "ref.refuser_devis" | "ref.restituer", refId: string) {
    const supabase = createClient();
    await executeAction({ actionId, supabase, ctx: actionCtx, referenceId: refId });
    router.refresh();
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

  async function handleSaveNotes() {
    setSavingNotes(true);
    const supabase = createClient();
    const { error } = await mutate(
      supabase
        .from("lots")
        .update({ notes: notes || null })
        .eq("id", lot.id),
      "Erreur lors de l'enregistrement des notes",
      "Notes sauvegardees"
    );
    if (error) { setSavingNotes(false); return; }
    setSavingNotes(false);
    setEditingNotes(false);
    router.refresh();
  }

  return (
    <>
      <Header
        title={lot.numero}
        backAction={
          <Button variant="ghost" size="icon-sm" aria-label="Retour" onClick={() => router.back()}>
            <ArrowLeft size={16} weight="regular" />
          </Button>
        }
      >
        <div className="flex items-center gap-2">
          <LotStatusBadge status={lot.status as LotStatus} outcome={lot.outcome} />
          {lot.status === "brouillon" && (
            <Button
              size="sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const { error } = await mutate(
                  supabase.from("lots").update({ updated_at: new Date().toISOString() }).eq("id", lot.id),
                  "Erreur lors de l'enregistrement du lot",
                  "Lot enregistre"
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

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
              <DetailRow label="Numero" value={lot.numero} />
              <DetailRow label="Type" value={typeLabel ?? "Rachat"} />
              <DetailRow label="Dossier" value={
                <span className="inline-flex items-center gap-1.5">
                  {lot.dossier.numero}
                  <PreviewLink entityType="dossier" entityId={lot.dossier.id} href={`/dossiers/${lot.dossier.id}`}>
                    <ArrowSquareOut size={14} weight="duotone" className="text-muted-foreground hover:text-foreground transition-colors" />
                  </PreviewLink>
                </span>
              } />
              <DetailRow label="Date de creation" value={formatDate(lot.created_at)} />
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
              <DetailRow label="Telephone" value={lot.dossier.client.phone ? <CopyableText value={lot.dossier.client.phone} /> : "—"} />
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
          isError={lot.outcome === "retracte" || lot.outcome === "refuse"}
          referenceStatuses={lot.references.map((r) => r.status)}
        />

        {/* Actions en attente */}
        {!isBrouillon && !isTerminal && (
          <LotActionsCard
            actions={availableActions}
            ctx={actionCtx}
            lot={lot}
            dossierClient={lot.dossier.client}
            lotId={lot.id}
          />
        )}

        {/* References section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package size={20} weight="duotone" />
              Références ({lot.references.length})
            </CardTitle>
            {isBrouillon && (
              isDepotVente ? (
                <Button variant="secondary" size="sm" onClick={() => { setShowFormBijoux(true); setShowFormOrInvest(false); }}>
                  <Plus size={14} weight="bold" />
                  Référence
                </Button>
              ) : (
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
                      Bijoux
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setShowFormOrInvest(true); setShowFormBijoux(false); }}
                    >
                      <Coins size={16} weight="duotone" />
                      Or Investissement
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
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
                Aucune reference. Ajoutez des bijoux ou de l&apos;or investissement.
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
                      commissionDvPct={commissionDvPct}
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
                  onRestituer={(id) => handleRefAction("ref.restituer", id)}
                  canRestituer={isDepotVente && lot.status === "finalise"}
                  hideTypeRachat={isDepotVente}
                  isDepotVente={isDepotVente}
                  onValiderRachat={(id) => handleRefAction("ref.valider_rachat", id)}
                  onRetracter={(id) => handleRefAction("ref.retracter", id)}
                  onAccepterDevis={(id) => handleRefAction("ref.accepter_devis", id)}
                  onRefuserDevis={(id) => handleRefAction("ref.refuser_devis", id)}
                />
                )
              ))
            )}

            {/* Récapitulatif prix */}
            {lot.references.length > 0 && (() => {
              const totalBrut = lot.references.reduce((sum, r) => sum + r.prix_achat * r.quantite, 0);

              if (isDepotVente) {
                const totalRevente = lot.references.reduce((sum, r) => sum + (r.prix_revente_estime ?? 0) * r.quantite, 0);
                const totalCommission = totalRevente - totalBrut;
                return (
                  <div className="rounded-lg border bg-muted/50 px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt size={16} weight="duotone" className="text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Récapitulatif</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground">Prix affiché</span>
                      <span className="font-semibold text-foreground">{formatCurrency(totalRevente)}</span>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Commission ({commissionDvPct} %)</span>
                        <span className="font-medium text-muted-foreground">− {formatCurrency(totalCommission)}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Prix net déposant</span>
                        <span className="text-lg font-bold">{formatCurrency(totalBrut)}</span>
                      </div>
                    </div>
                  </div>
                );
              }

              const totalTPV = lot.references
                .filter((r) => r.regime_fiscal === "TPV")
                .reduce((sum, r) => sum + r.montant_taxe * r.quantite, 0);
              const totalTMP = lot.references
                .filter((r) => r.regime_fiscal === "TMP")
                .reduce((sum, r) => sum + r.montant_taxe * r.quantite, 0);
              const totalTFOP = lot.references
                .filter((r) => r.regime_fiscal === "TFOP")
                .reduce((sum, r) => sum + r.montant_taxe * r.quantite, 0);
              const totalTaxe = totalTPV + totalTMP + totalTFOP;
              const totalNet = totalBrut - totalTaxe;
              const taxeLineCount = (totalTPV > 0 ? 1 : 0) + (totalTMP > 0 ? 1 : 0) + (totalTFOP > 0 ? 1 : 0);
              return (
                <div className="rounded-lg border bg-muted/50 px-4 py-3 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt size={16} weight="duotone" className="text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Récapitulatif</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Prix brut</span>
                    <span className="font-semibold text-foreground">{formatCurrency(totalBrut)} HT</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {totalTPV > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">TPV (Taxe sur les Plus-Values)</span>
                        <span className="font-medium text-muted-foreground">− {formatCurrency(totalTPV)}</span>
                      </div>
                    )}
                    {totalTMP > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">TMP (Taxe sur les Métaux Précieux)</span>
                        <span className="font-medium text-muted-foreground">− {formatCurrency(totalTMP)}</span>
                      </div>
                    )}
                    {totalTFOP > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">TFOP (Taxe Forfaitaire Objets Précieux)</span>
                        <span className="font-medium text-muted-foreground">− {formatCurrency(totalTFOP)}</span>
                      </div>
                    )}
                    {totalTaxe > 0 && taxeLineCount > 1 && (
                      <div className="border-t pt-1 mt-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">Total taxes</span>
                        <span className="font-semibold text-foreground">− {formatCurrency(totalTaxe)}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Prix de rachat net</span>
                      <span className="text-lg font-bold">{formatCurrency(totalNet)} TTC</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Documents */}
        <DocumentsTable documents={documents} />

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
