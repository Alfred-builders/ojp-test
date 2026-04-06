"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowCounterClockwise,
  Info as PhInfo,
  Ruler as PhRuler,
  CurrencyEur as PhCurrencyEur,
  Diamond as PhDiamond,
  SignIn,
  Storefront,
  PencilSimple,
  FloppyDisk,
  Package as PhPackage,
  Wrench,
  Factory,
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
import { StockLifecycleStepper } from "@/components/stock/stock-lifecycle-stepper";
import { EnvoiReparationDialog } from "@/components/stock/envoi-reparation-dialog";
import { RetourReparationDialog } from "@/components/stock/retour-reparation-dialog";
import { formatDate, formatCurrency } from "@/lib/format";
import type { BijouxStock, Reparation, StockOrigin, StockSale } from "@/types/bijoux";

const statutConfig: Record<
  BijouxStock["statut"],
  { label: string; className: string }
> = {
  en_stock: { label: "En stock", className: "bg-blue-500/10 text-blue-600 border-blue-600/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-400/30" },
  vendu: { label: "Vendu", className: "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20" },
  reserve: { label: "Réservé", className: "bg-amber-500/10 text-amber-600 border-amber-600/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30" },
  en_depot_vente: { label: "En dépôt", className: "bg-cyan-500/10 text-cyan-600 border-cyan-600/30 dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-400/30" },
  rendu_client: { label: "Rendu client", className: "bg-gray-500/10 text-gray-600 border-gray-600/30 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-400/30" },
  en_reparation: { label: "En réparation", className: "bg-orange-500/10 text-orange-600 border-orange-600/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-400/30" },
  fondu: { label: "Fondu", className: "bg-purple-500/10 text-purple-600 border-purple-600/30 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-400/30" },
  a_fondre: { label: "À fondre", className: "bg-violet-500/10 text-violet-600 border-violet-600/30 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-400/30" },
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

export function StockDetailPage({
  bijou,
  canEdit = true,
  origin,
  sale,
  reparations = [],
  activeReparation = null,
}: {
  bijou: BijouxStock;
  canEdit?: boolean;
  origin?: StockOrigin | null;
  sale?: StockSale | null;
  reparations?: Reparation[];
  activeReparation?: Reparation | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEnvoiDialog, setShowEnvoiDialog] = useState(false);
  const [showRetourDialog, setShowRetourDialog] = useState(false);

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
      "Erreur lors de la mise à jour du bijou"
    );
    setSaving(false);
    if (error) return;
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
            <Button variant="ghost" size="icon-sm" aria-label="Retour">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
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
              {bijou.statut === "en_stock" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setShowEnvoiDialog(true)}>
                    <Wrench size={16} weight="duotone" />
                    Envoyer en réparation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const supabase = createClient();
                      const { error } = await mutate(
                        supabase.from("bijoux_stock").update({ statut: "a_fondre" }).eq("id", bijou.id),
                        "Erreur lors de l'envoi en fonderie"
                      );
                      if (error) return;
                      router.refresh();
                    }}
                  >
                    <Factory size={16} weight="duotone" />
                    Envoyer en fonderie
                  </Button>
                </>
              )}
              {bijou.statut === "en_reparation" && activeReparation && (
                <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10" onClick={() => setShowRetourDialog(true)}>
                  <ArrowCounterClockwise size={16} weight="duotone" />
                  Récupérer
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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Lifecycle stepper */}
          <StockLifecycleStepper statut={bijou.statut} />

          {/* Existing 2x2 grid */}
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
                    <PhDiamond size={64} weight="duotone" />
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

          {/* Provenance card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SignIn size={20} weight="duotone" />
                Provenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {origin ? (
                origin.type === "depot_vente" ? (
                  <>
                    <LinkedRow
                      label="Déposant"
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
                  <>
                    <LinkedRow
                      label="Client vendeur"
                      value={formatClientName(origin.client)}
                      href={`/clients/${origin.client.id}`}
                    />
                    <LinkedRow
                      label="Dossier"
                      value={origin.dossier.numero}
                      href={`/dossiers/${origin.dossier.id}`}
                    />
                    <LinkedRow
                      label="Lot de rachat"
                      value={origin.lot.numero}
                      href={`/lots/${origin.lot.id}`}
                    />
                    {origin.reference && (
                      <LinkedRow
                        label="Référence"
                        value={origin.reference.designation}
                        href={`/references/${origin.reference.id}`}
                      />
                    )}
                    {origin.lot.date_finalisation && (
                      <LinkedRow
                        label="Date d'entrée en stock"
                        value={formatDate(origin.lot.date_finalisation)}
                      />
                    )}
                    {origin.reference?.prix_achat != null && (
                      <LinkedRow
                        label="Prix de rachat"
                        value={formatCurrency(origin.reference.prix_achat)}
                      />
                    )}
                  </>
                )
              ) : (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <PhPackage size={20} weight="duotone" />
                  <span>Article ajouté manuellement au stock.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique des réparations */}
          {reparations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench size={20} weight="duotone" />
                  Historique des réparations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reparations.map((rep) => (
                    <div key={rep.id} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              rep.statut === "en_cours"
                                ? "bg-orange-500/10 text-orange-600 border-orange-600/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-400/30"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-600/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30"
                            }
                          >
                            {rep.statut === "en_cours" ? "En cours" : "Terminée"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(rep.date_envoi)}
                            {rep.date_retour && ` → ${formatDate(rep.date_retour)}`}
                          </span>
                        </div>
                        {rep.description && (
                          <p className="text-sm text-muted-foreground">{rep.description}</p>
                        )}
                        {rep.notes && (
                          <p className="text-sm text-muted-foreground italic">{rep.notes}</p>
                        )}
                      </div>
                      <div className="text-right text-sm space-y-0.5 shrink-0">
                        {rep.cout_estime != null && (
                          <div className="text-muted-foreground">
                            Estimé : {formatCurrency(rep.cout_estime)}
                          </div>
                        )}
                        {rep.cout_reel != null && (
                          <div className="font-medium">
                            Réel : {formatCurrency(rep.cout_reel)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

      <EnvoiReparationDialog
        open={showEnvoiDialog}
        onOpenChange={setShowEnvoiDialog}
        bijouId={bijou.id}
      />

      {activeReparation && (
        <RetourReparationDialog
          open={showRetourDialog}
          onOpenChange={setShowRetourDialog}
          reparationId={activeReparation.id}
          bijouId={bijou.id}
          coutEstime={activeReparation.cout_estime}
        />
      )}
    </>
  );
}
