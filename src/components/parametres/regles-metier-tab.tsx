"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Scales,
  ShoppingCart,
  Storefront,
  Clock,
  CalendarDots,
} from "@phosphor-icons/react";
import { useSaveSetting } from "@/hooks/use-save-setting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessRulesSettings } from "@/types/settings";

interface ReglesMetierTabProps {
  settings: BusinessRulesSettings;
  onRegisterSave?: (fn: () => Promise<boolean>) => void;
}

export function ReglesMetierTab({ settings, onRegisterSave }: ReglesMetierTabProps) {
  const [form, setForm] = useState<BusinessRulesSettings>(settings);
  const { save } = useSaveSetting("business_rules", {
    successMessage: "Règles métier sauvegardées",
  });

  function updateNum(key: keyof BusinessRulesSettings, value: string) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setForm((prev) => ({ ...prev, [key]: num }));
    }
  }

  const doSave = useCallback(async () => {
    const payload = { ...form, solde_pct: 100 - form.acompte_pct };
    const ok = await save(payload);
    if (ok) setForm(payload);
    return ok;
  }, [form, save]);

  useEffect(() => {
    onRegisterSave?.(doSave);
  }, [doSave, onRegisterSave]);

  return (
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Card Rachat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scales size={20} weight="duotone" />
              Rachat
            </CardTitle>
            <CardDescription>
              Délais appliqués lors du processus de rachat de métaux précieux.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="retractation_h">Durée de rétractation</Label>
                <div className="relative">
                  <Input
                    id="retractation_h"
                    type="number"
                    min="1"
                    value={form.retractation_heures}
                    onChange={(e) => updateNum("retractation_heures", e.target.value)}
                    className="pr-8"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={12} weight="duotone" />
                  48 h = 2 jours
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="devis_validite_h">Validité d&apos;un devis</Label>
                <div className="relative">
                  <Input
                    id="devis_validite_h"
                    type="number"
                    min="1"
                    value={form.devis_validite_heures}
                    onChange={(e) => updateNum("devis_validite_heures", e.target.value)}
                    className="pr-8"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Vente Or Investissement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart size={20} weight="duotone" />
              Vente or investissement
            </CardTitle>
            <CardDescription>
              Pourcentages et délais pour les acomptes et soldes sur les ventes
              d&apos;or d&apos;investissement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="acompte_pct">Acompte</Label>
                <div className="relative">
                  <Input
                    id="acompte_pct"
                    type="number"
                    min="1"
                    max="100"
                    value={form.acompte_pct}
                    onChange={(e) => updateNum("acompte_pct", e.target.value)}
                    className="pr-7"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Solde (calculé)</Label>
                <div className="flex items-center h-9 rounded-md bg-muted px-3 text-sm font-medium">
                  {100 - form.acompte_pct} %
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="solde_delai">Délai paiement solde</Label>
                <div className="relative">
                  <Input
                    id="solde_delai"
                    type="number"
                    min="1"
                    value={form.solde_delai_heures}
                    onChange={(e) => updateNum("solde_delai_heures", e.target.value)}
                    className="pr-8"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Dépôt-vente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Storefront size={20} weight="duotone" />
              Dépôt-vente
            </CardTitle>
            <CardDescription>
              Paramètres du contrat de dépôt-vente : commission, durées, frais et alertes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commission_dv">Commission dépositaire</Label>
                <div className="relative">
                  <Input
                    id="commission_dv"
                    type="number"
                    min="0"
                    max="100"
                    value={form.commission_dv_pct}
                    onChange={(e) => updateNum("commission_dv_pct", e.target.value)}
                    className="pr-7"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Du prix de vente public</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contrat_duree">Durée du contrat</Label>
                <div className="relative">
                  <Input
                    id="contrat_duree"
                    type="number"
                    min="1"
                    value={form.contrat_dv_duree_mois}
                    onChange={(e) => updateNum("contrat_dv_duree_mois", e.target.value)}
                    className="pr-12"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mois</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preavis">Préavis résiliation</Label>
                <div className="relative">
                  <Input
                    id="preavis"
                    type="number"
                    min="1"
                    value={form.preavis_resiliation_jours}
                    onChange={(e) => updateNum("preavis_resiliation_jours", e.target.value)}
                    className="pr-10"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">jours</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="penalite">Pénalité retrait</Label>
                <div className="relative">
                  <Input
                    id="penalite"
                    type="number"
                    min="0"
                    max="100"
                    value={form.penalite_retrait_pct}
                    onChange={(e) => updateNum("penalite_retrait_pct", e.target.value)}
                    className="pr-7"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Du prix TTC</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forfait_nettoyage">Forfait nettoyage</Label>
                <div className="relative">
                  <Input
                    id="forfait_nettoyage"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.forfait_nettoyage}
                    onChange={(e) => updateNum("forfait_nettoyage", e.target.value)}
                    className="pr-7"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                </div>
                <p className="text-xs text-muted-foreground">TTC / objet</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="frais_garde">Frais de garde</Label>
                <div className="relative">
                  <Input
                    id="frais_garde"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.frais_garde_mois}
                    onChange={(e) => updateNum("frais_garde_mois", e.target.value)}
                    className="pr-7"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                </div>
                <p className="text-xs text-muted-foreground">TTC / mois</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delai_paiement">Délai paiement</Label>
                <div className="relative">
                  <Input
                    id="delai_paiement"
                    type="number"
                    min="1"
                    value={form.delai_paiement_deposant_jours}
                    onChange={(e) => updateNum("delai_paiement_deposant_jours", e.target.value)}
                    className="pr-10"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">jours</span>
                </div>
              </div>
            </div>

            <div className="max-w-xs space-y-2 pt-2">
              <Label htmlFor="seuil_identite">
                Seuil alerte expiration pièce d&apos;identité
              </Label>
              <div className="relative">
                <Input
                  id="seuil_identite"
                  type="number"
                  min="1"
                  value={form.seuil_alerte_identite_jours}
                  onChange={(e) => updateNum("seuil_alerte_identite_jours", e.target.value)}
                  className="pr-10"
                  required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">jours</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDots size={12} weight="duotone" />
                Jours avant expiration
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
