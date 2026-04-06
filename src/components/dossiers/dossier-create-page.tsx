"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  FolderOpen as PhFolderOpen,
  NotePencil as PhNotePencil,
  User as PhUser,
  FloppyDisk,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { dossierSchema } from "@/lib/validations/dossier";
import type { Client } from "@/types/client";

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function DossierCreatePage({ validClients }: { validClients: Client[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const paramClientId = searchParams.get("client_id") ?? "";
  const isParamValid = validClients.some((c) => c.id === paramClientId);
  const [clientId, setClientId] = useState(isParamValid ? paramClientId : "");
  const [notes, setNotes] = useState("");

  const selectedClient = validClients.find((c) => c.id === clientId) ?? null;

  async function handleCreate() {
    const formData = {
      client_id: clientId,
      notes,
    };

    const result = dossierSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("dossiers")
      .insert({
        numero: "",
        client_id: clientId,
        notes: notes || null,
        created_by: user?.id ?? "",
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      setErrors({ _form: "Erreur lors de la création du dossier." });
      return;
    }

    router.push(`/dossiers/${data.id}`);
  }

  return (
    <>
      <Header
        title="Nouveau dossier"
        backAction={
          <Link href="/dossiers">
            <Button variant="ghost" size="icon-sm" aria-label="Retour">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <Button size="sm" disabled={saving} onClick={handleCreate}>
          <FloppyDisk size={16} weight="duotone" />
          {saving ? "Création..." : "Créer"}
        </Button>
      </Header>
      <div className="flex-1 p-6">
        {errors._form && (
          <p className="text-sm text-destructive mb-4">{errors._form}</p>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Informations du dossier */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhFolderOpen size={20} weight="duotone" />
                Informations du dossier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Numéro</span>
                <span className="font-medium text-muted-foreground italic">Auto-généré</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Statut</span>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30">Ouvert</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhUser size={20} weight="duotone" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <p className="text-xs text-muted-foreground">
                  Seuls les clients avec une pièce d&apos;identité valide sont affichés.
                </p>
                <Select value={clientId} onValueChange={(val) => setClientId(val ?? "")}>
                  <SelectTrigger>
                    {selectedClient
                      ? <span className="truncate">{`${selectedClient.civility === "M" ? "M." : "Mme"} ${selectedClient.first_name} ${selectedClient.last_name}`}</span>
                      : <SelectValue placeholder="Sélectionner un client" />}
                  </SelectTrigger>
                  <SelectContent>
                    {validClients.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        Aucun client valide disponible.
                      </div>
                    ) : (
                      validClients.map((client) => {
                        const name = `${client.civility === "M" ? "M." : "Mme"} ${client.first_name} ${client.last_name}`;
                        return (
                          <SelectItem key={client.id} value={client.id}>
                            {name}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {errors.client_id && <p className="text-sm text-destructive">{errors.client_id}</p>}
              </div>
              {selectedClient && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-muted-foreground">Téléphone</span>
                    <span className="font-medium">{selectedClient.phone ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{selectedClient.email ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Ville</span>
                    <span className="font-medium">{selectedClient.city ?? "—"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhNotePencil size={20} weight="duotone" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField label="Notes" error={errors.notes}>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes sur le dossier..."
                  className="min-h-[150px] resize-none"
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
