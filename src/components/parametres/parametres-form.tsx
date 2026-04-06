"use client";

import { useState, useRef, useCallback } from "react";
import {
  CurrencyEur,
  FloppyDisk,
  Percent,
  Scales,
  Buildings,
  Gavel,
  FileText,
  Bell,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useSaveParametres } from "@/hooks/use-save-setting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmailTemplatesTab } from "@/components/parametres/email-templates-tab";
import { SocieteTab } from "@/components/parametres/societe-tab";
import { ReglesMetierTab } from "@/components/parametres/regles-metier-tab";
import { DocumentsTab } from "@/components/parametres/documents-tab";
import { NotificationsTab } from "@/components/parametres/notifications-tab";
import type { Parametres } from "@/types/parametres";
import type { EmailTemplate } from "@/types/email";
import type { SettingsMap } from "@/types/settings";

interface ParametresFormProps {
  parametres: Parametres;
  emailTemplates: EmailTemplate[];
  settings: SettingsMap;
}

type Section =
  | "societe"
  | "prix"
  | "regles"
  | "documents"
  | "emails"
  | "notifications";

const NAV_ITEMS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "societe", label: "Société", icon: <Buildings size={16} weight="duotone" /> },
  { key: "prix", label: "Prix & Coefficients", icon: <CurrencyEur size={16} weight="duotone" /> },
  { key: "regles", label: "Règles métier", icon: <Gavel size={16} weight="duotone" /> },
  { key: "documents", label: "Documents & PDF", icon: <FileText size={16} weight="duotone" /> },
  { key: "emails", label: "Emails", icon: <EnvelopeSimple size={16} weight="duotone" /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={16} weight="duotone" /> },
];

const SECTION_META: Record<Section, { title: string; description: string }> = {
  societe: {
    title: "Société",
    description: "Informations de votre société affichées sur les documents et emails.",
  },
  prix: {
    title: "Prix & Coefficients",
    description: "Cours des métaux précieux et coefficients de calcul des prix.",
  },
  regles: {
    title: "Règles métier",
    description: "Délais, pourcentages et paramètres appliqués aux processus de rachat, vente et dépôt-vente.",
  },
  documents: {
    title: "Documents & PDF",
    description: "Préfixes de numérotation, textes légaux et style des documents générés.",
  },
  emails: {
    title: "Emails",
    description: "Templates des emails envoyés aux clients et à l'équipe.",
  },
  notifications: {
    title: "Notifications",
    description: "Types de notifications actives, automatismes et destinataires internes.",
  },
};

export function ParametresForm({ parametres, emailTemplates, settings }: ParametresFormProps) {
  const [activeSection, setActiveSection] = useState<Section>("societe");
  const [globalSaving, setGlobalSaving] = useState(false);

  // Save function registered by the active tab
  const saveFnRef = useRef<(() => Promise<boolean>) | null>(null);

  const registerSave = useCallback((fn: () => Promise<boolean>) => {
    saveFnRef.current = fn;
  }, []);

  // Prix du cours state
  const [prixOr, setPrixOr] = useState(parametres.prix_or.toString());
  const [prixArgent, setPrixArgent] = useState(parametres.prix_argent.toString());
  const [prixPlatine, setPrixPlatine] = useState(parametres.prix_platine.toString());
  const { saving: savingPrix, save: savePrix } = useSaveParametres("Prix du cours mis à jour");

  // Coefficient state
  const [coefficient, setCoefficient] = useState(parametres.coefficient_rachat.toString());
  const [coefficientVente, setCoefficientVente] = useState(parametres.coefficient_vente.toString());
  const { saving: savingCoeff, save: saveCoeff } = useSaveParametres("Coefficients mis à jour");

  const initialPrix = useRef({ prixOr: parametres.prix_or.toString(), prixArgent: parametres.prix_argent.toString(), prixPlatine: parametres.prix_platine.toString() });
  const initialCoeff = useRef({ coefficient: parametres.coefficient_rachat.toString(), coefficientVente: parametres.coefficient_vente.toString() });

  // Register prix save function when prix section is active
  const prixSaveFn = useCallback(async () => {
    const { toast } = await import("sonner");

    const or = parseFloat(prixOr);
    const argent = parseFloat(prixArgent);
    const platine = parseFloat(prixPlatine);
    const coeff = parseFloat(coefficient);
    const coeffV = parseFloat(coefficientVente);

    if (isNaN(or) || isNaN(argent) || isNaN(platine)) {
      toast.error("Veuillez saisir des valeurs numériques valides pour les prix.");
      return false;
    }
    if (isNaN(coeff) || coeff < 0 || coeff > 2) {
      toast.error("Le coefficient de rachat doit être entre 0 et 2.");
      return false;
    }
    if (isNaN(coeffV) || coeffV < 0 || coeffV > 3) {
      toast.error("Le coefficient de vente doit être entre 0 et 3.");
      return false;
    }

    const [r1, r2] = await Promise.all([
      savePrix({ prix_or: or, prix_argent: argent, prix_platine: platine }),
      saveCoeff({ coefficient_rachat: coeff, coefficient_vente: coeffV }),
    ]);

    if (r1) initialPrix.current = { prixOr, prixArgent, prixPlatine };
    if (r2) initialCoeff.current = { coefficient, coefficientVente };

    return r1 && r2;
  }, [prixOr, prixArgent, prixPlatine, coefficient, coefficientVente, savePrix, saveCoeff]);

  // Keep the prix save registered when prix is the active section
  if (activeSection === "prix") {
    saveFnRef.current = prixSaveFn;
  }

  async function handleGlobalSave() {
    if (!saveFnRef.current) return;
    setGlobalSaving(true);
    await saveFnRef.current();
    setGlobalSaving(false);
  }

  const sectionMeta = SECTION_META[activeSection];
  const showGlobalSave = activeSection !== "emails";

  return (
    <div className="flex flex-1 min-h-0 -m-6">
      {/* Navigation latérale */}
      <nav className="w-52 shrink-0 border-r overflow-y-auto py-6 pl-6 pr-2">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveSection(item.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left",
                activeSection === item.key
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenu */}
      <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="pb-8">
          {/* En-tête de section avec bouton de sauvegarde global */}
          <div className="mx-auto max-w-3xl mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{sectionMeta.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{sectionMeta.description}</p>
            </div>
            {showGlobalSave && (
              <Button
                onClick={handleGlobalSave}
                disabled={globalSaving || savingPrix || savingCoeff}
                className="shrink-0"
              >
                <FloppyDisk size={16} weight="duotone" />
                {globalSaving || savingPrix || savingCoeff ? "Enregistrement..." : "Enregistrer"}
              </Button>
            )}
          </div>

          {/* Société */}
          {activeSection === "societe" && (
            <SocieteTab
              onRegisterSave={registerSave}
              settings={
                settings.company ?? {
                  nom: "",
                  adresse: "",
                  code_postal: "",
                  ville: "",
                  telephone: "",
                  email: "",
                  forme_juridique: "",
                  siret_rcs: "",
                  tribunal: "",
                  logo_url: "",
                  email_expediteur: "",
                  nom_expediteur: "",
                }
              }
            />
          )}

          {/* Prix & Coefficients */}
          {activeSection === "prix" && (
            <div className="mx-auto max-w-3xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CurrencyEur size={20} weight="duotone" />
                    Prix du cours des métaux
                  </CardTitle>
                  <CardDescription>
                    Prix au gramme de l&apos;or pur, l&apos;argent et le platine.
                    Base de tous les calculs de titrage (ex : or 750 = 75% du cours).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prix_or">Or</Label>
                      <div className="relative">
                        <Input
                          id="prix_or"
                          type="number"
                          step="0.001"
                          min="0"
                          value={prixOr}
                          onChange={(e) => setPrixOr(e.target.value)}
                          className="pr-10"
                          required
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€/g</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prix_argent">Argent</Label>
                      <div className="relative">
                        <Input
                          id="prix_argent"
                          type="number"
                          step="0.001"
                          min="0"
                          value={prixArgent}
                          onChange={(e) => setPrixArgent(e.target.value)}
                          className="pr-10"
                          required
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€/g</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prix_platine">Platine</Label>
                      <div className="relative">
                        <Input
                          id="prix_platine"
                          type="number"
                          step="0.001"
                          min="0"
                          value={prixPlatine}
                          onChange={(e) => setPrixPlatine(e.target.value)}
                          className="pr-10"
                          required
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€/g</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scales size={20} weight="duotone" />
                    Coefficients
                  </CardTitle>
                  <CardDescription>
                    Coefficients appliqués au calcul des prix de rachat et de
                    vente. Formule : Cours métal &times; (titrage/1000) &times;
                    poids &times; coefficient.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="coefficient">
                        Coefficient de rachat
                      </Label>
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
                        <Percent size={12} weight="duotone" />
                        0.85 = rachat à 85% du cours
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coefficient_vente">
                        Coefficient de vente
                      </Label>
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
                        <Percent size={12} weight="duotone" />
                        1.05 = vente à 105% du cours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Règles métier */}
          {activeSection === "regles" && (
            <ReglesMetierTab
              onRegisterSave={registerSave}
              settings={
                settings.business_rules ?? {
                  retractation_heures: 48,
                  devis_validite_heures: 48,
                  acompte_pct: 10,
                  solde_pct: 90,
                  solde_delai_heures: 48,
                  commission_dv_pct: 40,
                  contrat_dv_duree_mois: 12,
                  preavis_resiliation_jours: 7,
                  penalite_retrait_pct: 10,
                  forfait_nettoyage: 20,
                  frais_garde_mois: 10,
                  delai_paiement_deposant_jours: 15,
                  seuil_alerte_identite_jours: 30,
                }
              }
            />
          )}

          {/* Documents & PDF */}
          {activeSection === "documents" && (
            <DocumentsTab
              onRegisterSave={registerSave}
              prefixes={
                settings.document_prefixes ?? {
                  quittance_rachat: "QRA",
                  contrat_rachat: "CRA",
                  devis_rachat: "DEV",
                  contrat_depot_vente: "CDV",
                  confie_achat: "CON",
                  quittance_depot_vente: "QDV",
                  facture_vente: "FVE",
                  facture_acompte: "FAC",
                  facture_solde: "FSO",
                  bon_commande: "CMDF",
                }
              }
              legalTexts={
                settings.legal_texts ?? {
                  conditions_confie: "",
                  conditions_achat: "",
                  conditions_contrat: "",
                  devis_validite: "",
                  conditions_quittance_dv: "",
                  cgv_vente: "",
                  cgv_acompte: "",
                  conditions_bon_commande: "",
                  cdv_clauses: [],
                }
              }
              pdfStyle={
                settings.pdf_style ?? {
                  color_primary: "#C8A84E",
                  font_family: "Courier",
                }
              }
            />
          )}

          {/* Emails */}
          {activeSection === "emails" && (
            <EmailTemplatesTab templates={emailTemplates} />
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <NotificationsTab
              onRegisterSave={registerSave}
              settings={
                settings.notifications ?? {
                  types: {
                    dossier_created: true,
                    dossier_finalized: true,
                    lot_accepted: true,
                    lot_finalized: true,
                    lot_retracted: true,
                    vente_created: true,
                    vente_finalized: true,
                    vente_livree: true,
                    commande_received: true,
                    client_created: true,
                    system: true,
                  },
                  cron_lots_finalisables: "1h",
                  cron_acompte_expire: "15min",
                  emails_internes: [],
                }
              }
            />
          )}

        </div>
      </div>
    </div>
  );
}
