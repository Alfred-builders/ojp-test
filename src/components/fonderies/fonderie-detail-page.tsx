"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Factory,
  PencilSimple,
  FloppyDisk,
  MapPin,
  NotePencil,
  FileText,
  ChartBar,
  Diamond,
  WarningCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/dashboard/header";
import { formatDate, formatCurrency } from "@/lib/format";
import { BDC_STATUS_CONFIG, BDL_STATUS_CONFIG } from "@/lib/fonderie/status-config";
import type { Fonderie } from "@/types/fonderie";
import type { BonCommande } from "@/types/bon-commande";
import type { BonLivraison } from "@/types/bon-livraison";
import type { Reglement } from "@/types/reglement";

function DetailRow({ label, value, editing, editValue, onEditChange, type = "text" }: {
  label: string;
  value: React.ReactNode;
  editing?: boolean;
  editValue?: string;
  onEditChange?: (val: string) => void;
  type?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {editing && onEditChange ? (
        <Input type={type} value={editValue ?? ""} onChange={(e) => onEditChange(e.target.value)} className="w-64" />
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </div>
  );
}

interface FonderieDetailPageProps {
  fonderie: Fonderie;
  bonsCommande?: BonCommande[];
  bonsLivraison?: BonLivraison[];
  reglements?: Reglement[];
}

interface FonderieForm {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
}

export function FonderieDetailPage({
  fonderie,
  bonsCommande = [],
  bonsLivraison = [],
  reglements = [],
}: FonderieDetailPageProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FonderieForm>({
    nom: fonderie.nom,
    adresse: fonderie.adresse ?? "",
    codePostal: fonderie.code_postal ?? "",
    ville: fonderie.ville ?? "",
    telephone: fonderie.telephone ?? "",
    email: fonderie.email ?? "",
  });

  function updateField(field: keyof FonderieForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(fonderie.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  // Financial summary
  const financialSummary = useMemo(() => {
    const totalBDC = bonsCommande
      .filter((b) => b.statut !== "annule")
      .reduce((sum, b) => sum + b.montant_total, 0);
    const totalBDL = bonsLivraison
      .filter((b) => b.statut !== "annule")
      .reduce((sum, b) => sum + b.valeur_estimee, 0);
    const totalReglementsSortants = reglements
      .filter((r) => r.sens === "sortant")
      .reduce((sum, r) => sum + r.montant, 0);
    const totalReglementsEntrants = reglements
      .filter((r) => r.sens === "entrant")
      .reduce((sum, r) => sum + r.montant, 0);

    return {
      totalBDC,
      totalBDL,
      solde: totalBDL - totalBDC,
      totalPaye: totalReglementsSortants,
      totalRecu: totalReglementsEntrants,
      nbBDC: bonsCommande.filter((b) => b.statut !== "annule").length,
      nbBDL: bonsLivraison.filter((b) => b.statut !== "annule").length,
    };
  }, [bonsCommande, bonsLivraison, reglements]);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await mutate(
      supabase
        .from("fonderies")
        .update({
          nom: form.nom,
          adresse: form.adresse || null,
          code_postal: form.codePostal || null,
          ville: form.ville || null,
          telephone: form.telephone || null,
          email: form.email || null,
        })
        .eq("id", fonderie.id),
      "Erreur lors de la mise à jour de la fonderie",
      "Fonderie mise à jour"
    );
    setSaving(false);
    if (error) return;
    setEditing(false);
    router.refresh();
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    const supabase = createClient();
    const { error } = await mutate(
      supabase
        .from("fonderies")
        .update({ notes: notes || null })
        .eq("id", fonderie.id),
      "Erreur lors de la mise à jour des notes",
      "Notes sauvegardées"
    );
    setSavingNotes(false);
    if (error) return;
    setEditingNotes(false);
    router.refresh();
  }

  return (
    <>
      <Header
        title={fonderie.nom}
        backAction={
          <Button variant="ghost" size="icon-sm" aria-label="Retour" onClick={() => router.back()}>
            <ArrowLeft size={16} weight="regular" />
          </Button>
        }
      >
        {editing ? (
          <Button size="sm" disabled={saving} onClick={handleSave}>
            <FloppyDisk size={16} weight="duotone" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setEditing(true)}>
            <PencilSimple size={16} weight="duotone" />
            Modifier
          </Button>
        )}
      </Header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Financial summary */}
        {(financialSummary.nbBDC > 0 || financialSummary.nbBDL > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBar size={20} weight="duotone" />
                Résumé financier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total BDC (achats)</p>
                  <p className="text-lg font-bold">{formatCurrency(financialSummary.totalBDC)}</p>
                  <p className="text-xs text-muted-foreground">{financialSummary.nbBDC} bon{financialSummary.nbBDC > 1 ? "s" : ""}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total BDL (fonte)</p>
                  <p className="text-lg font-bold">{formatCurrency(financialSummary.totalBDL)}</p>
                  <p className="text-xs text-muted-foreground">{financialSummary.nbBDL} bon{financialSummary.nbBDL > 1 ? "s" : ""}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Payé (sortant)</p>
                  <p className="text-lg font-bold">{formatCurrency(financialSummary.totalPaye)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Reçu (entrant)</p>
                  <p className="text-lg font-bold">{formatCurrency(financialSummary.totalRecu)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Solde net estimé (BDL - BDC)</span>
                <span className={`text-lg font-bold ${financialSummary.solde >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {financialSummary.solde >= 0 ? "+" : ""}{formatCurrency(financialSummary.solde)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Informations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory size={20} weight="duotone" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Nom" value={fonderie.nom} editing={editing} editValue={form.nom} onEditChange={(v) => updateField("nom", v)} />
              <DetailRow label="Téléphone" value={fonderie.telephone ?? "—"} editing={editing} editValue={form.telephone} onEditChange={(v) => updateField("telephone", v)} type="tel" />
              <DetailRow label="Email" value={fonderie.email ?? "—"} editing={editing} editValue={form.email} onEditChange={(v) => updateField("email", v)} type="email" />
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={20} weight="duotone" />
                Adresse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Adresse" value={fonderie.adresse ?? "—"} editing={editing} editValue={form.adresse} onEditChange={(v) => updateField("adresse", v)} />
              <DetailRow label="Code postal" value={fonderie.code_postal ?? "—"} editing={editing} editValue={form.codePostal} onEditChange={(v) => updateField("codePostal", v)} />
              <DetailRow label="Ville" value={fonderie.ville ?? "—"} editing={editing} editValue={form.ville} onEditChange={(v) => updateField("ville", v)} />
            </CardContent>
          </Card>
        </div>

        {/* Bons de commande */}
        {bonsCommande.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} weight="duotone" />
                Bons de commande ({bonsCommande.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden bg-white dark:bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="pl-4">Numéro</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonsCommande.map((bdc) => {
                      const statusConfig = BDC_STATUS_CONFIG[bdc.statut] ?? BDC_STATUS_CONFIG.brouillon;
                      return (
                        <TableRow key={bdc.id} className="bg-white dark:bg-card cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/fonderie/suivi/bdc/${bdc.id}`)}>
                          <TableCell className="pl-4 font-medium">{bdc.numero}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(bdc.montant_total)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(bdc.created_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bons de livraison */}
        {bonsLivraison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Diamond size={20} weight="duotone" />
                Bons de livraison ({bonsLivraison.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {bonsLivraison.map((bdl) => {
                  const badge = BDL_STATUS_CONFIG[bdl.statut] ?? BDL_STATUS_CONFIG.brouillon;
                  const nbLignes = bdl.lignes?.length ?? 0;
                  const nbEcarts = (bdl.lignes ?? []).filter((l) => l.ecart_titrage || l.ecart_poids).length;

                  return (
                    <Link
                      key={bdl.id}
                      href={`/fonderie/suivi/bdl/${bdl.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{bdl.numero}</span>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
                            {badge.label}
                          </Badge>
                          {nbEcarts > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <WarningCircle size={10} weight="duotone" className="mr-0.5" />
                              {nbEcarts}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {nbLignes} article{nbLignes > 1 ? "s" : ""} · {bdl.poids_total.toFixed(1)}g
                          {bdl.date_envoi ? ` · ${formatDate(bdl.date_envoi)}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-bold shrink-0">{formatCurrency(bdl.valeur_estimee)}</span>
                      <ArrowRight size={14} weight="regular" className="text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
              <Button variant="ghost" size="icon-sm" onClick={() => setEditingNotes(true)} aria-label="Modifier les notes">
                <PencilSimple size={16} weight="duotone" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingNotes ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes sur la fonderie..."
                className="min-h-[100px] resize-none"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {fonderie.notes ?? "Aucune note."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
