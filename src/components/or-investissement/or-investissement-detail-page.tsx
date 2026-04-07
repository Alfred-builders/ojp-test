"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Info as PhInfo,
  Package as PhPackage,
  PencilSimple,
  FloppyDisk,
  Wrench,
  CurrencyEur,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { OrInvestissement } from "@/types/or-investissement";

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

export function OrInvestissementDetailPage({ item, canEdit = true }: { item: OrInvestissement; canEdit?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [designation, setDesignation] = useState(item.designation);
  const [pays, setPays] = useState(item.pays ?? "");
  const [annees, setAnnees] = useState(item.annees ?? "");
  const [metal, setMetal] = useState(item.metal ?? "");
  const [titre, setTitre] = useState(item.titre ?? "");
  const [poids, setPoids] = useState(item.poids?.toString() ?? "");
  const [quantite, setQuantite] = useState(item.quantite.toString());
  const [parametres, setParametres] = useState<{
    prix_or: number | null;
    prix_argent: number | null;
    prix_platine: number | null;
    coefficient_rachat: number | null;
    coefficient_vente: number | null;
  } | null>(null);

  useEffect(() => {
    async function fetchParametres() {
      const supabase = createClient();
      const { data } = await supabase.from("parametres").select("*").single();
      if (data) setParametres(data);
    }
    fetchParametres();
  }, []);

  function getCoursForMetal(metalType: string | null): number {
    if (!parametres || !metalType) return 0;
    if (metalType === "Or") return parametres.prix_or ?? 0;
    if (metalType === "Argent") return parametres.prix_argent ?? 0;
    if (metalType === "Platine") return parametres.prix_platine ?? 0;
    return 0;
  }

  const cours = getCoursForMetal(item.metal);
  const titreNum = item.titre ? parseFloat(item.titre) : 0;
  const poidsNum = item.poids ?? 0;
  const coeffRachat = parametres?.coefficient_rachat ?? 0;
  const coeffVente = parametres?.coefficient_vente ?? 0;

  const prixRachat = cours * poidsNum * (titreNum / 1000) * coeffRachat;
  const prixVente = cours * poidsNum * (titreNum / 1000) * coeffVente;

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("or_investissement")
      .update({
        designation,
        pays: pays || null,
        annees: annees || null,
        metal: metal || null,
        titre: titre || null,
        poids: poids ? parseFloat(poids) : null,
        quantite: quantite ? parseInt(quantite) : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <>
      <Header
        title={item.designation}
        backAction={
          <Button variant="ghost" size="icon-sm" aria-label="Retour" onClick={() => router.back()}>
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
            <Button size="sm" onClick={() => setEditing(true)}>
              <PencilSimple size={16} weight="duotone" />
              Modifier
            </Button>
          )
        )}
      </Header>
      <div className="flex-1 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Informations produit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhInfo size={20} weight="duotone" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Désignation" value={item.designation} editing={editing} editValue={designation} onEditChange={setDesignation} />
              <DetailRow label="Pays" value={item.pays ?? "—"} editing={editing} editValue={pays} onEditChange={setPays} />
              <DetailRow label="Années" value={item.annees ?? "—"} editing={editing} editValue={annees} onEditChange={setAnnees} />
            </CardContent>
          </Card>

          {/* Caractéristiques */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench size={20} weight="duotone" />
                Caractéristiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow
                label="Métal"
                value={item.metal ?? "—"}
                editing={editing}
                editContent={
                  <Select value={metal} onValueChange={(val) => setMetal(val ?? "")}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Or">Or</SelectItem>
                      <SelectItem value="Argent">Argent</SelectItem>
                      <SelectItem value="Autres">Autres</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <DetailRow label="Titre" value={item.titre ?? "—"} editing={editing} editValue={titre} onEditChange={setTitre} />
              <DetailRow label="Poids" value={item.poids !== null ? `${item.poids} g` : "—"} editing={editing} editValue={poids} onEditChange={setPoids} type="number" />
            </CardContent>
          </Card>

          {/* Prix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CurrencyEur size={20} weight="duotone" />
                Prix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Cours du métal" value={parametres ? `${formatCurrency(cours)}/g` : "Chargement..."} />
              <DetailRow label="Prix de rachat" value={formatCurrency(prixRachat)} />
              <DetailRow label="Prix de vente" value={formatCurrency(prixVente)} />
              {prixVente > 0 && prixRachat > 0 && (
                <DetailRow label="Marge" value={formatCurrency(prixVente - prixRachat)} />
              )}
            </CardContent>
          </Card>

          {/* Stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhPackage size={20} weight="duotone" />
                Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Quantité" value={item.quantite} editing={editing} editValue={quantite} onEditChange={setQuantite} type="number" />
              <DetailRow label="Dernière modification" value={formatDate(item.updated_at)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
