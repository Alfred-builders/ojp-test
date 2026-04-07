"use client";

import { useState } from "react";
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
import type { Fonderie } from "@/types/fonderie";
import type { BonCommande } from "@/types/bon-commande";

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

const BDC_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  envoye: { label: "Envoyé", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "Reçu", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  paye: { label: "Payé", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  annule: { label: "Annulé", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function FonderieDetailPage({ fonderie, bonsCommande = [] }: { fonderie: Fonderie; bonsCommande?: BonCommande[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nom, setNom] = useState(fonderie.nom);
  const [adresse, setAdresse] = useState(fonderie.adresse ?? "");
  const [codePostal, setCodePostal] = useState(fonderie.code_postal ?? "");
  const [ville, setVille] = useState(fonderie.ville ?? "");
  const [telephone, setTelephone] = useState(fonderie.telephone ?? "");
  const [email, setEmail] = useState(fonderie.email ?? "");

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(fonderie.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await mutate(
      supabase
        .from("fonderies")
        .update({
          nom,
          adresse: adresse || null,
          code_postal: codePostal || null,
          ville: ville || null,
          telephone: telephone || null,
          email: email || null,
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
          <Link href="/fonderies">
            <Button variant="ghost" size="icon-sm" aria-label="Retour">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
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

      <div className="flex-1 p-6 space-y-6">
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
              <DetailRow label="Nom" value={fonderie.nom} editing={editing} editValue={nom} onEditChange={setNom} />
              <DetailRow label="Téléphone" value={fonderie.telephone ?? "—"} editing={editing} editValue={telephone} onEditChange={setTelephone} type="tel" />
              <DetailRow label="Email" value={fonderie.email ?? "—"} editing={editing} editValue={email} onEditChange={setEmail} type="email" />
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
              <DetailRow label="Adresse" value={fonderie.adresse ?? "—"} editing={editing} editValue={adresse} onEditChange={setAdresse} />
              <DetailRow label="Code postal" value={fonderie.code_postal ?? "—"} editing={editing} editValue={codePostal} onEditChange={setCodePostal} />
              <DetailRow label="Ville" value={fonderie.ville ?? "—"} editing={editing} editValue={ville} onEditChange={setVille} />
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
                        <TableRow key={bdc.id} className="bg-white dark:bg-card">
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
