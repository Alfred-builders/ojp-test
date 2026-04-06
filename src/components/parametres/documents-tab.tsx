"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Hash,
  Palette,
  Scroll,
} from "@phosphor-icons/react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-[200px] rounded-md border border-input bg-muted animate-pulse" /> }
);
import type { DocumentPrefixesSettings, LegalTextsSettings, PdfStyleSettings, CdvClause } from "@/types/settings";
import type { DocumentType } from "@/types/document";

interface DocumentsTabProps {
  prefixes: DocumentPrefixesSettings;
  legalTexts: LegalTextsSettings;
  pdfStyle: PdfStyleSettings;
  onRegisterSave?: (fn: () => Promise<boolean>) => void;
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  quittance_rachat: "Quittance de rachat",
  contrat_rachat: "Contrat de rachat",
  devis_rachat: "Devis de rachat",
  contrat_depot_vente: "Contrat dépôt-vente",
  confie_achat: "Confié achat",
  quittance_depot_vente: "Quittance dépôt-vente",
  facture_vente: "Facture de vente",
  facture_acompte: "Facture d'acompte",
  facture_solde: "Facture de solde",
  bon_commande: "Bon de commande",
  bon_livraison: "Bon de livraison",
};

type LegalTextKey = Exclude<keyof LegalTextsSettings, "cdv_clauses">;

const LEGAL_TEXT_LABELS: Record<LegalTextKey, string> = {
  conditions_confie: "Conditions confié",
  conditions_achat: "Conditions achat (rachat)",
  conditions_contrat: "Conditions contrat (rétractation)",
  devis_validite: "Validité devis",
  conditions_quittance_dv: "Conditions quittance dépôt-vente",
  cgv_vente: "CGV Vente",
  cgv_acompte: "CGV Acompte",
  conditions_bon_commande: "Conditions bon de commande",
};

const FONT_OPTIONS = [
  { value: "Courier", label: "Courier" },
  { value: "Helvetica", label: "Helvetica" },
];

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function DocumentsTab({ prefixes: initialPrefixes, legalTexts: initialTexts, pdfStyle: initialStyle, onRegisterSave }: DocumentsTabProps) {
  const [prefixes, setPrefixes] = useState<DocumentPrefixesSettings>(initialPrefixes);
  const [legalTexts, setLegalTexts] = useState<LegalTextsSettings>(initialTexts);
  const [pdfStyle, setPdfStyle] = useState<PdfStyleSettings>(initialStyle);
  const [selectedText, setSelectedText] = useState<LegalTextKey | "cdv">("conditions_confie");

  const { save: savePrefixes } = useSaveSetting("document_prefixes", {
    successMessage: "Préfixes sauvegardés",
  });
  const { save: saveTexts } = useSaveSetting("legal_texts", {
    successMessage: "Textes légaux sauvegardés",
  });
  const { save: saveStyle } = useSaveSetting("pdf_style", {
    successMessage: "Style PDF sauvegardé",
  });

  function updatePrefix(type: DocumentType, value: string) {
    setPrefixes((prev) => ({ ...prev, [type]: value }));
  }

  function updateLegalText(key: LegalTextKey, value: string) {
    setLegalTexts((prev) => ({ ...prev, [key]: value }));
  }

  function updateCdvClause(index: number, field: keyof CdvClause, value: string) {
    setLegalTexts((prev) => {
      const clauses = [...prev.cdv_clauses];
      clauses[index] = { ...clauses[index], [field]: value };
      return { ...prev, cdv_clauses: clauses };
    });
  }

  const doSave = useCallback(async () => {
    const [r1, r2, r3] = await Promise.all([
      savePrefixes(prefixes),
      saveTexts(legalTexts),
      saveStyle(pdfStyle),
    ]);
    return r1 && r2 && r3;
  }, [prefixes, legalTexts, pdfStyle, savePrefixes, saveTexts, saveStyle]);

  useEffect(() => {
    onRegisterSave?.(doSave);
  }, [doSave, onRegisterSave]);

  function handleColorChange(value: string) {
    setPdfStyle((prev) => ({ ...prev, color_primary: value }));
  }

  function handleColorInputBlur() {
    if (!HEX_REGEX.test(pdfStyle.color_primary)) {
      toast.error("Format de couleur invalide", {
        description: "Utilisez le format hexadécimal #RRGGBB.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Card Préfixes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash size={20} weight="duotone" />
            Préfixes de numérotation
          </CardTitle>
          <CardDescription>
            Préfixes utilisés dans les numéros de documents (ex : QRA-2025-0001).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-48 shrink-0">
                  {DOC_TYPE_LABELS[type]}
                </Label>
                <Input
                  value={prefixes[type] ?? ""}
                  onChange={(e) => updatePrefix(type, e.target.value.toUpperCase())}
                  className="w-24 font-mono text-center"
                  maxLength={6}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card Textes légaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scroll size={20} weight="duotone" />
            Textes légaux
          </CardTitle>
          <CardDescription>
            Textes et conditions générales insérés dans les documents PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sélectionner un texte</Label>
            <Select
              value={selectedText}
              onValueChange={(v) => setSelectedText(v as LegalTextKey | "cdv")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LEGAL_TEXT_LABELS) as LegalTextKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {LEGAL_TEXT_LABELS[key]}
                  </SelectItem>
                ))}
                <SelectItem value="cdv">Clauses contrat dépôt-vente (11)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedText !== "cdv" ? (
            <RichTextEditor
              key={selectedText}
              content={legalTexts[selectedText] ?? ""}
              onChange={(html) => updateLegalText(selectedText, html)}
            />
          ) : (
            <div className="space-y-4">
              {legalTexts.cdv_clauses.map((clause, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Article {i + 1}
                    </span>
                    <Input
                      value={clause.title}
                      onChange={(e) => updateCdvClause(i, "title", e.target.value)}
                      className="font-semibold"
                      placeholder="Titre de la clause"
                    />
                  </div>
                  <RichTextEditor
                    key={`cdv-${i}`}
                    content={clause.body}
                    onChange={(html) => updateCdvClause(i, "body", html)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Style PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette size={20} weight="duotone" />
            Style PDF
          </CardTitle>
          <CardDescription>
            Couleur d&apos;accentuation et police utilisées dans les documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="color_primary">Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="color_primary"
                  value={HEX_REGEX.test(pdfStyle.color_primary) ? pdfStyle.color_primary : "#C8A84E"}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border"
                />
                <Input
                  value={pdfStyle.color_primary}
                  onChange={(e) => handleColorChange(e.target.value)}
                  onBlur={handleColorInputBlur}
                  className="w-28 font-mono"
                  maxLength={7}
                  placeholder="#C8A84E"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Police</Label>
              <Select
                value={pdfStyle.font_family}
                onValueChange={(v) =>
                  setPdfStyle((prev) => ({ ...prev, font_family: String(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
