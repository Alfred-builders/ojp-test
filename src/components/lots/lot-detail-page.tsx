"use client";

import { useState } from "react";
import { CopyableText } from "@/components/ui/copyable-text";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  FilePdf,
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
import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { LotStatusActions } from "@/components/lots/lot-status-actions";
import { LotSummaryCard } from "@/components/lots/lot-summary-card";
import { ReferenceCard } from "@/components/lots/reference-card";
import { ReferenceFormBijoux } from "@/components/lots/reference-form-bijoux";
import { ReferenceFormOrInvest } from "@/components/lots/reference-form-or-invest";

import {
  generateQuittanceRachat,
  generateContratRachat,
  generateDevisRachat,
  downloadBlob,
  type ClientInfo,
  type DossierInfo,
  type ReferenceLigne,
  type TotauxInfo,
} from "@/lib/pdf";
import type { LotWithReferences, LotReference, RachatStatus } from "@/types/lot";
import type { OrInvestissement } from "@/types/or-investissement";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

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
}

export function LotDetailPage({ lot, orInvestCatalog, typeLabel, backHref }: LotDetailPageProps) {
  const router = useRouter();
  const [showFormBijoux, setShowFormBijoux] = useState(false);
  const [showFormOrInvest, setShowFormOrInvest] = useState(false);
  const [editingRef, setEditingRef] = useState<LotReference | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lot.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const isBrouillon = lot.status === "brouillon";
  const isTerminal = lot.status === "refuse" || lot.status === "retracte" || lot.status === "finalise";
  const isDepotVente = lot.type === "depot_vente";
  const isFinalisedDepotVente = isDepotVente && lot.status === "finalise";
  const clientName = `${lot.dossier.client.civility === "M" ? "M." : "Mme"} ${lot.dossier.client.first_name} ${lot.dossier.client.last_name}`;

  async function handleDeleteReference(refId: string) {
    const supabase = createClient();
    await supabase.from("lot_references").delete().eq("id", refId);
    router.refresh();
  }

  async function handleRestituer(refId: string) {
    const supabase = createClient();
    // Find the reference to get its linked stock entry
    const ref = lot.references.find((r) => r.id === refId);

    // Update lot_reference status
    await supabase
      .from("lot_references")
      .update({ status: "rendu_client" })
      .eq("id", refId);

    // Also update the linked bijoux_stock entry
    if (ref?.destination_stock_id) {
      await supabase
        .from("bijoux_stock")
        .update({ statut: "rendu_client" })
        .eq("id", ref.destination_stock_id);
    }

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
      await supabase
        .from("lots")
        .update({ status: "finalise", date_finalisation: new Date().toISOString() })
        .eq("id", lot.id);

      // Check dossier
      const { data: allLots } = await supabase
        .from("lots")
        .select("status")
        .eq("dossier_id", lot.dossier_id);

      const allDone = (allLots ?? []).every(
        (l) => l.status === "finalise" || l.status === "termine"
      );

      if (allDone) {
        await supabase
          .from("dossiers")
          .update({ status: "finalise" })
          .eq("id", lot.dossier_id);
      }
    }
  }

  async function handleValiderRachat(refId: string) {
    const supabase = createClient();
    const ref = lot.references.find((r) => r.id === refId);
    if (!ref || ref.categorie !== "bijoux") return;

    // Create bijoux_stock entry
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
        statut: "en_stock",
      })
      .select("id")
      .single();

    await supabase
      .from("lot_references")
      .update({
        status: "finalise",
        destination_stock_id: stockEntry?.id ?? null,
      })
      .eq("id", refId);

    await checkAndFinalizeLot();
    router.refresh();
  }

  async function handleRetracter(refId: string) {
    const supabase = createClient();
    await supabase
      .from("lot_references")
      .update({ status: "retracte" })
      .eq("id", refId);

    await checkAndFinalizeLot();
    router.refresh();
  }

  async function handleAccepterDevis(refId: string) {
    const supabase = createClient();
    const ref = lot.references.find((r) => r.id === refId);
    if (!ref) return;

    if (ref.categorie === "or_investissement" && ref.or_investissement_id) {
      // Or invest devis accepté → stock immédiat
      await supabase.rpc("increment_or_invest_quantite", {
        p_id: ref.or_investissement_id,
        p_qty: ref.quantite,
      });
      await supabase
        .from("lot_references")
        .update({ status: "finalise" })
        .eq("id", refId);
    } else {
      // Bijoux devis accepté → en_retractation (nouveau 48h)
      const now = new Date();
      const delai = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      await supabase
        .from("lot_references")
        .update({
          status: "en_retractation",
          date_envoi: now.toISOString(),
          date_fin_delai: delai.toISOString(),
        })
        .eq("id", refId);
    }

    await checkAndFinalizeLot();
    router.refresh();
  }

  async function handleRefuserDevis(refId: string) {
    const supabase = createClient();
    await supabase
      .from("lot_references")
      .update({ status: "devis_refuse" })
      .eq("id", refId);

    await checkAndFinalizeLot();
    router.refresh();
  }

  function buildPdfData() {
    const client: ClientInfo = {
      civilite: lot.dossier.client.civility === "M" ? "M." : "Mme",
      nom: lot.dossier.client.last_name,
      prenom: lot.dossier.client.first_name,
      ville: lot.dossier.client.city ?? undefined,
    };

    const now = new Date();
    const dossierInfo: DossierInfo = {
      numeroDossier: lot.dossier.numero,
      numeroLot: lot.numero,
      date: new Intl.DateTimeFormat("fr-FR").format(now),
      heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };

    const references: ReferenceLigne[] = lot.references.map((ref) => ({
      designation: ref.designation,
      metal: ref.metal ?? "—",
      titrage: ref.qualite ?? "—",
      poids: ref.poids ?? 0,
      quantite: ref.quantite,
      taxe: ref.montant_taxe > 0 ? "11.5%" : "0%",
      prixUnitaire: ref.prix_achat,
      prixTotal: ref.prix_achat * ref.quantite,
    }));

    const totaux: TotauxInfo = {
      totalBrut: lot.total_prix_achat,
      taxe: lot.montant_taxe,
      netAPayer: lot.montant_net,
    };

    return { client, dossier: dossierInfo, references, totaux };
  }

  async function handleDownloadQuittance() {
    const data = buildPdfData();
    const blob = await generateQuittanceRachat({ ...data, numero: `QRA-${lot.numero}` });
    downloadBlob(blob, `quittance-${lot.numero}.pdf`);
  }

  async function handleDownloadContrat() {
    const data = buildPdfData();
    const blob = await generateContratRachat({ ...data, numero: `CRA-${lot.numero}` });
    downloadBlob(blob, `contrat-${lot.numero}.pdf`);
  }

  async function handleDownloadDevis() {
    const data = buildPdfData();
    const blob = await generateDevisRachat({ ...data, numero: `DEV-${lot.numero}` });
    downloadBlob(blob, `devis-${lot.numero}.pdf`);
  }

  return (
    <>
      <Header
        title={lot.numero}
        backAction={
          <Link href={backHref ?? `/dossiers/${lot.dossier.id}`}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <div className="flex items-center gap-2">
          <LotStatusBadge status={lot.status as RachatStatus} />
          <LotStatusActions lot={lot} />
          {lot.type === "rachat" && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    <FilePdf size={16} weight="duotone" />
                    PDF
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadQuittance}>
                  Quittance de rachat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadContrat}>
                  Contrat de rachat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadDevis}>
                  Devis de rachat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary cards */}
        <LotSummaryCard
          totalPrixAchat={lot.total_prix_achat}
          totalPrixRevente={lot.total_prix_revente}
          margeBrute={lot.marge_brute}
          montantTaxe={lot.montant_taxe}
          montantNet={lot.montant_net}
          lotType={isDepotVente ? "depot_vente" : "rachat"}
        />

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
                  <Link href={`/dossiers/${lot.dossier.id}`} target="_blank">
                    <ArrowSquareOut size={14} weight="duotone" className="text-muted-foreground hover:text-foreground transition-colors" />
                  </Link>
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
