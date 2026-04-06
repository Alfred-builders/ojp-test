"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Buildings,
  EnvelopeSimple,
  UploadSimple,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSaveSetting } from "@/hooks/use-save-setting";
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
import type { CompanySettings } from "@/types/settings";

interface SocieteTabProps {
  settings: CompanySettings;
  onRegisterSave?: (fn: () => Promise<boolean>) => void;
}

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 Mo

export function SocieteTab({ settings, onRegisterSave }: SocieteTabProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CompanySettings>(settings);
  const [uploading, setUploading] = useState(false);
  const { save } = useSaveSetting("company", {
    successMessage: "Informations société sauvegardées",
  });

  function update(key: keyof CompanySettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_SIZE) {
      toast.error("Le fichier est trop volumineux", {
        description: "Taille maximum : 2 Mo.",
      });
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const path = `settings/logo-${Date.now()}.${file.name.split(".").pop()}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      toast.error("Erreur lors de l'upload", { description: uploadError.message });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(path);

    setForm((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Logo mis à jour");
  }

  const doSave = useCallback(async () => {
    return await save(form);
  }, [form, save]);

  useEffect(() => {
    onRegisterSave?.(doSave);
  }, [doSave, onRegisterSave]);

  return (
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Card Identité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Buildings size={20} weight="duotone" />
              Identité de la société
            </CardTitle>
            <CardDescription>
              Ces informations apparaissent sur tous les documents PDF générés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_nom">Nom de la société</Label>
              <Input
                id="company_nom"
                value={form.nom}
                onChange={(e) => update("nom", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_adresse">Adresse</Label>
              <Input
                id="company_adresse"
                value={form.adresse}
                onChange={(e) => update("adresse", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_cp">Code postal</Label>
                <Input
                  id="company_cp"
                  value={form.code_postal}
                  onChange={(e) => update("code_postal", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_ville">Ville</Label>
                <Input
                  id="company_ville"
                  value={form.ville}
                  onChange={(e) => update("ville", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_telephone">Téléphone</Label>
                <Input
                  id="company_telephone"
                  value={form.telephone}
                  onChange={(e) => update("telephone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email">Email de contact</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_forme">Forme juridique</Label>
                <Input
                  id="company_forme"
                  value={form.forme_juridique}
                  onChange={(e) => update("forme_juridique", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_siret">SIRET / RCS</Label>
                <Input
                  id="company_siret"
                  value={form.siret_rcs}
                  onChange={(e) => update("siret_rcs", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_tribunal">Tribunal compétent</Label>
              <Input
                id="company_tribunal"
                value={form.tribunal}
                onChange={(e) => update("tribunal", e.target.value)}
              />
            </div>

            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <Image
                    src={form.logo_url}
                    alt="Logo"
                    width={96}
                    height={48}
                    className="h-12 rounded border object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-12 w-24 items-center justify-center rounded border border-dashed">
                    <ImageIcon
                      size={20}
                      weight="duotone"
                      className="text-muted-foreground"
                    />
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadSimple size={16} weight="duotone" />
                  {uploading ? "Upload..." : "Changer le logo"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PNG ou SVG, fond transparent. 2 Mo maximum.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EnvelopeSimple size={20} weight="duotone" />
              Expéditeur email
            </CardTitle>
            <CardDescription>
              Nom et adresse affichés comme expéditeur des emails envoyés aux
              clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_nom_exp">Nom expéditeur</Label>
                <Input
                  id="company_nom_exp"
                  value={form.nom_expediteur}
                  onChange={(e) => update("nom_expediteur", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email_exp">Email expéditeur</Label>
                <Input
                  id="company_email_exp"
                  type="email"
                  value={form.email_expediteur}
                  onChange={(e) => update("email_expediteur", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
