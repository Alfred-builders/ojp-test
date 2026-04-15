"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowUUpLeft,
  Info as PhInfo,
  Ruler as PhRuler,
  CurrencyEur as PhCurrencyEur,
  HandCoins as PhHandCoins,
  SignIn,
  Storefront,
  PencilSimple,
  FloppyDisk,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
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
import { formatDate, formatCurrency } from "@/lib/format";
import type { BijouxStock, StockOrigin, StockSale } from "@/types/bijoux";

const statutConfig: Record<string, { label: string; className: string }> = {
  en_depot_vente: { label: "En dépôt", className: "bg-cyan-500/10 text-cyan-600 border-cyan-600/30 dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-400/30" },
  vendu: { label: "Vendu", className: "bg-emerald-500/10 text-emerald-600 border-emerald-600/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30" },
  rendu_client: { label: "Rendu client", className: "bg-gray-500/10 text-gray-600 border-gray-600/30 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-400/30" },
};

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

function LinkedRow({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          {value}
          <ArrowSquareOut size={14} weight="regular" />
        </Link>
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </div>
  );
}

function formatClientName(client: StockOrigin["client"]) {
  return `${client.civility} ${client.first_name} ${client.last_name}`;
}

export function ConfieAchatDetailPage({
  bijou,
  canEdit = true,
  origin,
  sale,
}: {
  bijou: BijouxStock;
  canEdit?: boolean;
  origin?: StockOrigin | null;
  sale?: StockSale | null;
}) {
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

  const statut = statutConfig[bijou.statut] ?? { label: bijou.statut, className: "" };

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await mutate(
      supabase
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
        .eq("id", bijou.id),
      "Erreur lors de la mise à jour",
      "Confié d'achat mis à jour"
    );
    setSaving(false);
    if (error) return;
    setEditing(false);
    router.refresh();
  }

  async function handleRestituer() {
    const supabase = createClient();
    const { error } = await mutate(
      supabase.from("bijoux_stock").update({ statut: "rendu_client" }).eq("id", bijou.id),
      "Erreur lors de la restitution",
      "Article restitué au client"
    );
    if (error) return;
    router.refresh();
  }

  const parsedPrixAchat = prixAchat ? parseFloat(prixAchat) : null;
  const parsedPrixRevente = prixRevente ? parseFloat(prixRevente) : null;

  return (
    <>
      <Header
        title={bijou.nom}
        backAction={
          <Button variant="ghost" size="icon-sm" aria-label="Retour" onClick={() => router.push("/confie-achat")}>
            <ArrowLeft size={16} weight="regular" />
          </Button>
        }
      >
        {canEdit && (
          editing ? (
            <Button size="sm" disabled={saving} onClick={handleSave}>
              <FloppyDisk size={16} weight="duotone" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {bijou.statut === "en_depot_vente" && (
                <Button size="sm" variant="outline" onClick={handleRestituer}>
                  <ArrowUUpLeft size={16} weight="duotone" />
                  Restituer au client
                </Button>
              )}
              <Button size="sm" onClick={() => setEditing(true)}>
                <PencilSimple size={16} weight="duotone" />
                Modifier
              </Button>
            </div>
          )
        )}
      </Header>
      <div className="flex-1 p-6">
        <div className="space-y-6">
          {/* Status banner */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`text-sm px-3 py-1 ${statut.className}`}>
              {statut.label}
            </Badge>
            {origin && (
              <span className="text-sm text-muted-foreground">
                Déposé le {formatDate(origin.lot.date_finalisation ?? bijou.date_creation)}
                {origin.client && ` par ${formatClientName(origin.client)}`}
              </span>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Photo */}
            <Card>
              <CardContent className="flex items-center justify-center min-h-[300px]">
                {bijou.photo_url ? (
                  <Image
                    src={bijou.photo_url}
                    alt={bijou.nom}
                    width={400}
                    height={400}
                    className="max-h-[400px] rounded-lg object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <PhHandCoins size={64} weight="duotone" />
                    <span>Aucune photo.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhInfo size={20} weight="duotone" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DetailRow label="Nom" value={bijou.nom} editing={editing} editValue={nom} onEditChange={setNom} />
                <DetailRow
                  label="Statut"
                  value={<Badge variant="outline" className={statut.className}>{statut.label}</Badge>}
                />
                <DetailRow
                  label="Description"
                  value={bijou.description ?? "—"}
                  editing={editing}
                  editContent={
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-48 min-h-[80px] resize-none"
                    />
                  }
                />
                <DetailRow label="Date de dépôt" value={formatDate(origin?.lot.date_finalisation ?? bijou.date_creation)} />
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
                <DetailRow label="Poids brut" value={bijou.poids_brut !== null ? `${bijou.poids_brut} g` : bijou.poids !== null ? `${bijou.poids} g` : "—"} editing={editing} editValue={poids} onEditChange={setPoids} type="number" />
                <DetailRow label="Poids net" value={bijou.poids_net !== null ? `${bijou.poids_net} g` : bijou.poids !== null ? `${bijou.poids} g` : "—"} />
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
                <DetailRow label="Prix déposant" value={formatCurrency(bijou.prix_achat)} editing={editing} editValue={prixAchat} onEditChange={setPrixAchat} type="number" />
                <DetailRow label="Prix public" value={formatCurrency(bijou.prix_revente)} editing={editing} editValue={prixRevente} onEditChange={setPrixRevente} type="number" />
                {parsedPrixAchat && parsedPrixRevente && !editing && (
                  <DetailRow label="Commission" value={formatCurrency(parsedPrixRevente - parsedPrixAchat)} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Provenance / Déposant card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SignIn size={20} weight="duotone" />
                Déposant
              </CardTitle>
            </CardHeader>
            <CardContent>
              {origin ? (
                <>
                  <LinkedRow
                    label="Client déposant"
                    value={formatClientName(origin.client)}
                    href={`/clients/${origin.client.id}`}
                  />
                  <LinkedRow
                    label="Lot dépôt-vente"
                    value={origin.lot.numero}
                    href={`/lots/${origin.lot.id}`}
                  />
                  <LinkedRow
                    label="Dossier"
                    value={origin.dossier.numero}
                    href={`/dossiers/${origin.dossier.id}`}
                  />
                  {origin.lot.date_finalisation && (
                    <LinkedRow
                      label="Date de dépôt"
                      value={formatDate(origin.lot.date_finalisation)}
                    />
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <PhHandCoins size={20} weight="duotone" />
                  <span>Informations déposant non disponibles.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vente card (conditional) */}
          {sale && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Storefront size={20} weight="duotone" />
                  Vente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LinkedRow
                  label="Client acheteur"
                  value={formatClientName(sale.client)}
                  href={`/clients/${sale.client.id}`}
                />
                <LinkedRow
                  label="Dossier"
                  value={sale.dossier.numero}
                  href={`/dossiers/${sale.dossier.id}`}
                />
                <LinkedRow
                  label="Lot de vente"
                  value={sale.lot.numero}
                  href={`/lots/${sale.lot.id}`}
                />
                {sale.ligne.prix_total != null && (
                  <LinkedRow
                    label="Prix de vente"
                    value={formatCurrency(sale.ligne.prix_total)}
                  />
                )}
                <LinkedRow
                  label="Livraison"
                  value={
                    <Badge
                      variant="outline"
                      className={
                        sale.ligne.is_livre
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-600/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-600/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30"
                      }
                    >
                      {sale.ligne.is_livre ? "Livré" : "En attente"}
                    </Badge>
                  }
                />
                <LinkedRow
                  label="Date de vente"
                  value={formatDate(sale.lot.date_livraison ?? sale.lot.created_at)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
