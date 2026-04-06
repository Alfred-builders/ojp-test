"use client";

import { useState } from "react";
import { CopyableText } from "@/components/ui/copyable-text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User as PhUser,
  MapPin as PhMapPin,
  Info as PhInfo,
  IdentificationCard as PhIdCard,
  FolderOpen as PhFolderOpen,
  NotePencil as PhNotePencil,
  PencilSimple,
  FloppyDisk,
  Eye,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Header } from "@/components/dashboard/header";
import { clientSchema, LEAD_SOURCE_OPTIONS } from "@/lib/validations/client";
import { IdentityDocumentSection } from "@/components/clients/identity-document-form";
import type { Client, ClientIdentityDocument } from "@/types/client";
import type { Dossier } from "@/types/dossier";
import { DocumentsTable } from "@/components/documents/documents-table";
import { formatDate } from "@/lib/format";

function DetailRow({
  label,
  value,
  editing,
  editValue,
  onEditChange,
  type = "text",
  editContent,
  noBorder,
}: {
  label: string;
  value: React.ReactNode;
  editing?: boolean;
  editValue?: string;
  onEditChange?: (val: string) => void;
  type?: string;
  editContent?: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${noBorder ? "" : "border-b last:border-0"}`}>
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

export function ClientDetailPage({
  client,
  identityDocuments,
  dossiers,
  pdfDocuments,
}: {
  client: Client;
  identityDocuments: ClientIdentityDocument[];
  dossiers: Dossier[];
  pdfDocuments?: import("@/types/document").DocumentRecord[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [civility, setCivility] = useState(client.civility);
  const [firstName, setFirstName] = useState(client.first_name);
  const [lastName, setLastName] = useState(client.last_name);
  const [maidenName, setMaidenName] = useState(client.maiden_name ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [address, setAddress] = useState(client.address ?? "");
  const [city, setCity] = useState(client.city ?? "");
  const [postalCode, setPostalCode] = useState(client.postal_code ?? "");
  const [country, setCountry] = useState(client.country ?? "France");
  const [leadSource, setLeadSource] = useState(client.lead_source ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");

  async function handleSave() {
    const formData = {
      civility,
      first_name: firstName,
      last_name: lastName,
      maiden_name: maidenName,
      email,
      phone,
      address,
      city,
      postal_code: postalCode,
      country,
      lead_source: leadSource,
      notes,
    };

    const result = clientSchema.safeParse(formData);
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
    await supabase
      .from("clients")
      .update({
        civility,
        first_name: firstName,
        last_name: lastName,
        maiden_name: maidenName || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postal_code: postalCode || null,
        country: country || null,
        lead_source: leadSource || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleSaveNotes() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("clients")
      .update({ notes: notes || null, updated_at: new Date().toISOString() })
      .eq("id", client.id);
    setSaving(false);
    setEditingNotes(false);
    router.refresh();
  }

  const displayName = `${client.civility === "M" ? "M." : "Mme"} ${client.first_name} ${client.last_name}`;

  return (
    <>
      <Header
        title={displayName}
        backAction={
          <Link href="/clients">
            <Button variant="ghost" size="icon-sm" aria-label="Retour">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        {editing ? (
          <Button size="sm" disabled={saving} onClick={handleSave}>
            <FloppyDisk size={16} weight="duotone" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setEditing(true)}>
            <PencilSimple size={16} weight="duotone" />
            Modifier
          </Button>
        )}
      </Header>
      <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhUser size={20} weight="duotone" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow
                label="Civilité"
                value={client.civility === "M" ? "Monsieur" : "Madame"}
                editing={editing}
                editContent={
                  <Select value={civility} onValueChange={(val) => { if (val) setCivility(val as "M" | "Mme"); }}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Monsieur</SelectItem>
                      <SelectItem value="Mme">Madame</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <DetailRow label="Prénom" value={client.first_name} editing={editing} editValue={firstName} onEditChange={setFirstName} />
              {errors.first_name && editing && <p className="text-sm text-destructive text-right -mt-1 mb-1">{errors.first_name}</p>}
              <DetailRow label="Nom" value={client.last_name} editing={editing} editValue={lastName} onEditChange={setLastName} />
              {errors.last_name && editing && <p className="text-sm text-destructive text-right -mt-1 mb-1">{errors.last_name}</p>}
              <DetailRow label="Nom de jeune fille" value={client.maiden_name ?? "—"} editing={editing} editValue={maidenName} onEditChange={setMaidenName} />
              <DetailRow
                label="Email"
                value={client.email ? <CopyableText value={client.email} /> : "—"}
                editing={editing}
                editContent={
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                }
              />
              {errors.email && editing && <p className="text-sm text-destructive text-right -mt-1 mb-1">{errors.email}</p>}
              <DetailRow
                label="Téléphone"
                value={client.phone ? <CopyableText value={client.phone} /> : "—"}
                editing={editing}
                editContent={
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                }
              />
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhMapPin size={20} weight="duotone" />
                Adresse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Adresse" value={client.address ?? "—"} editing={editing} editValue={address} onEditChange={setAddress} />
              <DetailRow label="Code postal" value={client.postal_code ?? "—"} editing={editing} editValue={postalCode} onEditChange={setPostalCode} />
              <DetailRow label="Ville" value={client.city ?? "—"} editing={editing} editValue={city} onEditChange={setCity} />
              <DetailRow label="Pays" value={client.country ?? "—"} editing={editing} editValue={country} onEditChange={setCountry} />
            </CardContent>
          </Card>

          {/* Pièces d'identité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhIdCard size={20} weight="duotone" />
                Pièces d&apos;identité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <IdentityDocumentSection
                clientId={client.id}
                documents={identityDocuments}
              />
            </CardContent>
          </Card>

          {/* Dossiers du client */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <PhFolderOpen size={20} weight="duotone" />
              Dossiers
            </h3>
            {dossiers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun dossier pour ce client.
              </p>
            ) : (
              <div className="rounded-lg border overflow-hidden bg-white dark:bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="pl-4">Numéro</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10 pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossiers.map((dossier) => (
                      <TableRow
                        key={dossier.id}
                        className="cursor-pointer"
                        onClick={() => window.open(`/dossiers/${dossier.id}`, "_blank")}
                      >
                        <TableCell className="pl-4 font-medium">{dossier.numero}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              dossier.status === "finalise"
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                : dossier.status === "en_cours"
                                  ? "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                            }
                          >
                            {dossier.status === "finalise" ? "Finalisé" : dossier.status === "en_cours" ? "En cours" : "Brouillon"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(dossier.created_at)}</TableCell>
                        <TableCell className="pr-4">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/dossiers/${dossier.id}`, "_blank");
                            }}
                          >
                            <Eye size={16} weight="duotone" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Documents du client */}
          <div className="md:col-span-3">
            <DocumentsTable documents={pdfDocuments ?? []} />
          </div>

          {/* Notes */}
          <Card className="md:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PhNotePencil size={20} weight="duotone" />
                Notes
              </CardTitle>
              {editingNotes ? (
                <Button variant="secondary" size="sm" disabled={saving} onClick={handleSaveNotes}>
                  <FloppyDisk size={14} weight="duotone" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              ) : (
                <Button variant="ghost" size="icon-sm" onClick={() => setEditingNotes(true)} aria-label="Modifier les notes">
                  <PencilSimple size={16} weight="duotone" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes sur le client..."
                  className="min-h-[150px] resize-none"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {client.notes ?? "Aucune note."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Informations complémentaires */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhInfo size={20} weight="duotone" />
                Informations complémentaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 divide-x">
                <div className="pr-4">
                  <DetailRow
                    label="Source"
                    value={client.lead_source ?? "—"}
                    editing={editing}
                    editContent={
                      <Select value={leadSource} onValueChange={(val) => setLeadSource(val ?? "")}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_SOURCE_OPTIONS.map((src) => (
                            <SelectItem key={src} value={src}>
                              {src}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                </div>
                <div className="pl-4">
                  <DetailRow label="Date de création" value={formatDate(client.created_at)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
