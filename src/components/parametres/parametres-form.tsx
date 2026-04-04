"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CurrencyEur,
  FloppyDisk,
  Percent,
  Scales,
  PaintBrush,
  Sun,
  Moon,
  Desktop,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { Parametres } from "@/types/parametres";

interface ParametresFormProps {
  parametres: Parametres;
}

export function ParametresForm({ parametres }: ParametresFormProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Prix du cours state
  const [prixOr, setPrixOr] = useState(parametres.prix_or.toString());
  const [prixArgent, setPrixArgent] = useState(parametres.prix_argent.toString());
  const [prixPlatine, setPrixPlatine] = useState(parametres.prix_platine.toString());
  const [loadingPrix, setLoadingPrix] = useState(false);
  const [errorPrix, setErrorPrix] = useState("");
  const [successPrix, setSuccessPrix] = useState(false);

  // Coefficient state
  const [coefficient, setCoefficient] = useState(parametres.coefficient_rachat.toString());
  const [coefficientVente, setCoefficientVente] = useState(parametres.coefficient_vente.toString());
  const [loadingCoeff, setLoadingCoeff] = useState(false);
  const [errorCoeff, setErrorCoeff] = useState("");
  const [successCoeff, setSuccessCoeff] = useState(false);

  async function handleSubmitPrix(e: React.FormEvent) {
    e.preventDefault();
    setErrorPrix("");
    setSuccessPrix(false);
    setLoadingPrix(true);

    const or = parseFloat(prixOr);
    const argent = parseFloat(prixArgent);
    const platine = parseFloat(prixPlatine);

    if (isNaN(or) || isNaN(argent) || isNaN(platine)) {
      setErrorPrix("Veuillez saisir des valeurs numériques valides.");
      setLoadingPrix(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("parametres")
      .update({
        prix_or: or,
        prix_argent: argent,
        prix_platine: platine,
      })
      .eq("id", 1);

    if (error) {
      setErrorPrix(error.message);
      setLoadingPrix(false);
      return;
    }

    setSuccessPrix(true);
    setLoadingPrix(false);
    router.refresh();
  }

  async function handleSubmitCoefficient(e: React.FormEvent) {
    e.preventDefault();
    setErrorCoeff("");
    setSuccessCoeff(false);
    setLoadingCoeff(true);

    const coeff = parseFloat(coefficient);
    const coeffV = parseFloat(coefficientVente);

    if (isNaN(coeff) || coeff < 0 || coeff > 2 || isNaN(coeffV) || coeffV < 0 || coeffV > 3) {
      setErrorCoeff("Les coefficients doivent être des nombres valides.");
      setLoadingCoeff(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("parametres")
      .update({ coefficient_rachat: coeff, coefficient_vente: coeffV })
      .eq("id", 1);

    if (error) {
      setErrorCoeff(error.message);
      setLoadingCoeff(false);
      return;
    }

    setSuccessCoeff(true);
    setLoadingCoeff(false);
    router.refresh();
  }

  return (
    <Tabs defaultValue="prix-du-cours">
      <TabsList>
        <TabsTrigger value="prix-du-cours">Prix du cours</TabsTrigger>
        <TabsTrigger value="apparence">Apparence</TabsTrigger>
      </TabsList>

      <TabsContent value="prix-du-cours" className="mt-6">
        <div className="max-w-2xl space-y-6">
          {/* Card 1: Prix du cours des métaux */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CurrencyEur size={20} weight="duotone" />
                Prix du cours des métaux
              </CardTitle>
              <CardDescription>
                Configurez le prix au gramme de l&apos;or pur, l&apos;argent et
                le platine. Ces prix servent de base pour tous les calculs de
                titrage (ex : or 750 = 75% du prix du cours).
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitPrix}>
              <CardContent className="space-y-4 pb-6">
                {errorPrix && (
                  <p className="text-sm text-destructive">{errorPrix}</p>
                )}
                {successPrix && (
                  <p className="text-sm text-primary">
                    Prix du cours mis à jour avec succès.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prix_or">Or (€/g)</Label>
                    <Input
                      id="prix_or"
                      type="number"
                      step="0.01"
                      min="0"
                      value={prixOr}
                      onChange={(e) => setPrixOr(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prix_argent">Argent (€/g)</Label>
                    <Input
                      id="prix_argent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={prixArgent}
                      onChange={(e) => setPrixArgent(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prix_platine">Platine (€/g)</Label>
                    <Input
                      id="prix_platine"
                      type="number"
                      step="0.01"
                      min="0"
                      value={prixPlatine}
                      onChange={(e) => setPrixPlatine(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loadingPrix}>
                  <FloppyDisk size={16} weight="duotone" />
                  {loadingPrix ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Card 2: Coefficients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scales size={20} weight="duotone" />
                Coefficients
              </CardTitle>
              <CardDescription>
                Coefficients appliqués au calcul des prix de rachat et de vente.
                Formule : Cours métal &times; (titrage/1000) &times; poids
                &times; coefficient.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitCoefficient}>
              <CardContent className="space-y-4 pb-6">
                {errorCoeff && (
                  <p className="text-sm text-destructive">{errorCoeff}</p>
                )}
                {successCoeff && (
                  <p className="text-sm text-primary">
                    Coefficients mis à jour avec succès.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="coefficient">Coefficient de rachat</Label>
                    <Input
                      id="coefficient"
                      type="number"
                      step="0.01"
                      min="0"
                      max="2"
                      value={coefficient}
                      onChange={(e) => setCoefficient(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Percent size={12} weight="regular" />
                      0.85 = rachat à 85% du cours
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coefficient_vente">Coefficient de vente</Label>
                    <Input
                      id="coefficient_vente"
                      type="number"
                      step="0.01"
                      min="0"
                      max="3"
                      value={coefficientVente}
                      onChange={(e) => setCoefficientVente(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Percent size={12} weight="regular" />
                      1.05 = vente à 105% du cours
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loadingCoeff}>
                  <FloppyDisk size={16} weight="duotone" />
                  {loadingCoeff ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="apparence" className="mt-6">
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PaintBrush size={20} weight="duotone" />
                Apparence
              </CardTitle>
              <CardDescription>
                Choisissez le th&egrave;me de l&apos;application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-colors cursor-pointer ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Sun size={24} weight="duotone" />
                  <span className="text-sm font-medium">Clair</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-colors cursor-pointer ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Moon size={24} weight="duotone" />
                  <span className="text-sm font-medium">Sombre</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-colors cursor-pointer ${
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Desktop size={24} weight="duotone" />
                  <span className="text-sm font-medium">Syst&egrave;me</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
