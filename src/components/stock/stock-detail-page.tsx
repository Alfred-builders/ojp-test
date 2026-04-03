"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Info as PhInfo,
  Ruler as PhRuler,
  CurrencyEur as PhCurrencyEur,
  Diamond as PhDiamond,
  PencilSimple,
  FloppyDisk,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { BijouxStock } from "@/types/bijoux";

const statutConfig: Record<
  BijouxStock["statut"],
  { label: string; className: string }
> = {
  en_stock: { label: "En stock", className: "bg-blue-500/10 text-blue-600 border-blue-600/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-400/30" },
  vendu: { label: "Vendu", className: "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20" },
  reserve: { label: "Réservé", className: "bg-amber-500/10 text-amber-600 border-amber-600/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30" },
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(dateStr));
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

export function StockDetailPage({ bijou }: { bijou: BijouxStock }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nom, setNom] = useState(bijou.nom);
  const [description, setDescription] = useState(bijou.description ?? "");
  const [metaux, setMetaux] = useState(bijou.metaux ?? "");
  const [qualite, setQualite] = useState(bijou.qualite ?? "");
  const [titrage, setTitrage] = useState(bijou.titrage ?? "");
  const [poids, setPoids] = useState(bijou.poids?.toString() ?? "");
  const [quantite, setQuantite] = useState(bijou.quantite?.toString() ?? "");
  const [prixAchat, setPrixAchat] = useState(bijou.prix_achat?.toString() ?? "");
  const [prixRevente, setPrixRevente] = useState(bijou.prix_revente?.toString() ?? "");

  const statut = statutConfig[bijou.statut];

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("bijoux_stock")
      .update({
        nom,
        description: description || null,
        metaux: metaux || null,
        qualite: qualite || null,
        titrage: titrage || null,
        poids: poids ? parseFloat(poids) : null,
        quantite: quantite ? parseInt(quantite) : null,
        prix_achat: prixAchat ? parseFloat(prixAchat) : null,
        prix_revente: prixRevente ? parseFloat(prixRevente) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bijou.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  const parsedPrixAchat = prixAchat ? parseFloat(prixAchat) : null;
  const parsedPrixRevente = prixRevente ? parseFloat(prixRevente) : null;

  return (
    <>
      <Header
        title={bijou.nom}
        backAction={
          <Link href="/stock">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft size={16} weight="duotone" />
            </Button>
          </Link>
        }
      >
        {editing ? (
          <Button size="sm" disabled={saving} onClick={handleSave}>
            <FloppyDisk size={16} weight="duotone" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <PencilSimple size={16} weight="duotone" />
            Modifier
          </Button>
        )}
      </Header>
      <div className="flex-1 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Photo */}
          <Card>
            <CardContent className="flex items-center justify-center min-h-[300px]">
              {bijou.photo_url ? (
                <img
                  src={bijou.photo_url}
                  alt={bijou.nom}
                  className="max-h-[400px] rounded-lg object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <PhDiamond size={64} weight="duotone" />
                  <span>Aucune photo</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhInfo size={20} weight="duotone" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Nom" value={bijou.nom} editing={editing} editValue={nom} onEditChange={setNom} />
              <DetailRow
                label="Statut"
                value={<Badge variant="outline" className={statut.className}>{statut.label}</Badge>}
              />
              <DetailRow label="Description" value={bijou.description ?? "—"} editing={editing} editValue={description} onEditChange={setDescription} />
              <DetailRow label="Date de création" value={formatDate(bijou.date_creation)} />
            </CardContent>
          </Card>

          {/* Caractéristiques */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhRuler size={20} weight="duotone" />
                Caractéristiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow
                label="Métal"
                value={bijou.metaux ?? "—"}
                editing={editing}
                editContent={
                  <Select value={metaux} onValueChange={(val) => setMetaux(val ?? "")}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Or">Or</SelectItem>
                      <SelectItem value="Platine">Platine</SelectItem>
                      <SelectItem value="Argent">Argent</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <DetailRow label="Qualité" value={bijou.qualite ?? "—"} editing={editing} editValue={qualite} onEditChange={setQualite} />
              <DetailRow label="Titrage" value={bijou.titrage ?? "—"} editing={editing} editValue={titrage} onEditChange={setTitrage} />
              <DetailRow label="Poids" value={bijou.poids !== null ? `${bijou.poids} g` : "—"} editing={editing} editValue={poids} onEditChange={setPoids} type="number" />
              <DetailRow label="Quantité" value={bijou.quantite ?? "—"} editing={editing} editValue={quantite} onEditChange={setQuantite} type="number" />
            </CardContent>
          </Card>

          {/* Prix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhCurrencyEur size={20} weight="duotone" />
                Prix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Prix d'achat" value={formatCurrency(bijou.prix_achat)} editing={editing} editValue={prixAchat} onEditChange={setPrixAchat} type="number" />
              <DetailRow label="Prix de revente" value={formatCurrency(bijou.prix_revente)} editing={editing} editValue={prixRevente} onEditChange={setPrixRevente} type="number" />
              {parsedPrixAchat && parsedPrixRevente && !editing && (
                <DetailRow label="Marge" value={formatCurrency(parsedPrixRevente - parsedPrixAchat)} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
