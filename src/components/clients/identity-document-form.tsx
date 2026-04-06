"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash, IdentificationCard, Camera, X, DotsThree, Eye, PencilSimple, Star } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { identityDocumentSchema, DOCUMENT_TYPE_OPTIONS } from "@/lib/validations/client";
import { formatDate, formatDateISO } from "@/lib/format";
import type { ClientIdentityDocument } from "@/types/client";

const documentTypeLabels: Record<string, string> = {
  cni: "CNI",
  passeport: "Passeport",
  titre_sejour: "Titre de séjour",
  permis_conduire: "Permis de conduire",
};

async function getSignedUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("identity-documents")
    .createSignedUrl(path, 300); // 5 min
  return data?.signedUrl ?? null;
}

export function IdentityDocumentSection({
  clientId,
  documents,
}: {
  clientId: string;
  documents: ClientIdentityDocument[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState<Date | undefined>(undefined);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [nationality, setNationality] = useState("Française");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  function resetForm() {
    // Revoke object URL to prevent memory leak
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setDocumentType("");
    setDocumentNumber("");
    setIssueDate(undefined);
    setExpiryDate(undefined);
    setNationality("Française");
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrors({});
    setShowForm(false);
    setEditingDocId(null);
  }

  async function startEdit(doc: ClientIdentityDocument) {
    if (saving) return; // Prevent concurrent edits while saving
    setEditingDocId(doc.id);
    setDocumentType(doc.document_type);
    setDocumentNumber(doc.document_number);
    setIssueDate(doc.issue_date ? new Date(doc.issue_date) : undefined);
    setExpiryDate(doc.expiry_date ? new Date(doc.expiry_date) : undefined);
    setNationality(doc.nationality ?? "Française");
    setPhotoFile(null);
    setShowForm(false);
    // Load signed URL for existing photo
    if (doc.photo_url) {
      const url = await getSignedUrl(doc.photo_url);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous object URL to prevent memory leak
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  function removePhoto() {
    // Revoke object URL to prevent memory leak
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return null;
    const supabase = createClient();
    const ext = photoFile.name.split(".").pop();
    const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("identity-documents")
      .upload(path, photoFile);
    return error ? null : path;
  }

  async function handleAdd() {
    const issueDateStr = issueDate ? formatDateISO(issueDate) : "";
    const expiryDateStr = expiryDate ? formatDateISO(expiryDate) : "";

    const formData = {
      document_type: documentType,
      document_number: documentNumber,
      issue_date: issueDateStr,
      expiry_date: expiryDateStr,
      nationality,
      is_primary: documents.length === 0,
    };

    const result = identityDocumentSchema.safeParse(formData);
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
    const photoUrl = await uploadPhoto();

    const { error } = await supabase.from("client_identity_documents").insert({
      client_id: clientId,
      document_type: documentType,
      document_number: documentNumber,
      issue_date: issueDateStr || null,
      expiry_date: expiryDateStr || null,
      nationality: nationality || null,
      photo_url: photoUrl,
      is_primary: documents.length === 0,
    });

    setSaving(false);
    if (error) { toast.error("Erreur lors de l'ajout du document"); return; }
    resetForm();
    router.refresh();
  }

  async function handleUpdate(doc: ClientIdentityDocument) {
    const issueDateStr = issueDate ? formatDateISO(issueDate) : "";
    const expiryDateStr = expiryDate ? formatDateISO(expiryDate) : "";

    const formData = {
      document_type: documentType,
      document_number: documentNumber,
      issue_date: issueDateStr,
      expiry_date: expiryDateStr,
      nationality,
      is_primary: doc.is_primary,
    };

    const result = identityDocumentSchema.safeParse(formData);
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

    let photoUrl = doc.photo_url;
    if (photoFile) {
      // Remove old photo if exists
      if (doc.photo_url) {
        await supabase.storage.from("identity-documents").remove([doc.photo_url]);
      }
      photoUrl = await uploadPhoto();
    }

    const { error } = await supabase
      .from("client_identity_documents")
      .update({
        document_type: documentType,
        document_number: documentNumber,
        issue_date: issueDateStr || null,
        expiry_date: expiryDateStr || null,
        nationality: nationality || null,
        photo_url: photoUrl,
      })
      .eq("id", doc.id);

    setSaving(false);
    if (error) { toast.error("Erreur lors de la mise à jour du document"); return; }
    resetForm();
    router.refresh();
  }

  async function handleDelete(docId: string, photoPath: string | null) {
    const supabase = createClient();
    if (photoPath) {
      await supabase.storage.from("identity-documents").remove([photoPath]);
    }
    const { error } = await supabase
      .from("client_identity_documents")
      .delete()
      .eq("id", docId);
    if (error) { toast.error("Erreur lors de la suppression du document"); return; }
    setConfirmDeleteId(null);
    router.refresh();
  }

  async function handleSetPrimary(docId: string) {
    const supabase = createClient();
    // Remove primary from all docs of this client
    const { error: resetError } = await supabase
      .from("client_identity_documents")
      .update({ is_primary: false })
      .eq("client_id", clientId);
    if (resetError) { toast.error("Erreur lors de la mise à jour du document principal"); return; }
    // Set the selected one as primary
    const { error } = await supabase
      .from("client_identity_documents")
      .update({ is_primary: true })
      .eq("id", docId);
    if (error) { toast.error("Erreur lors de la mise à jour du document principal"); return; }
    router.refresh();
  }

  async function handleViewPhoto(photoPath: string | null) {
    if (!photoPath) return;
    setLoadingPhoto(true);
    const url = await getSignedUrl(photoPath);
    setLoadingPhoto(false);
    if (url) setViewingPhotoUrl(url);
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Aucune pièce d&apos;identité enregistrée.</p>
      )}

      {documents.map((doc) => (
        <div key={doc.id}>
          {editingDocId === doc.id ? (
            /* --- Edit form --- */
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label>Type de document *</Label>
                <Select value={documentType} onValueChange={(val) => setDocumentType(val ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner">
                      {DOCUMENT_TYPE_OPTIONS.find((o) => o.value === documentType)?.label ?? "Sélectionner"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.document_type && <p className="text-sm text-destructive">{errors.document_type}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Numéro *</Label>
                <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="123456789" />
                {errors.document_number && <p className="text-sm text-destructive">{errors.document_number}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date d&apos;émission</Label>
                  <DatePicker value={issueDate} onChange={setIssueDate} placeholder="Sélectionner" />
                </div>
                <div className="space-y-1.5">
                  <Label>Date d&apos;expiration</Label>
                  <DatePicker value={expiryDate} onChange={setExpiryDate} placeholder="Sélectionner" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Nationalité</Label>
                <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Photo du document</Label>
                {photoPreview ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-20 w-32 overflow-hidden rounded-md border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Aperçu" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                    <Button variant="ghost" size="icon-xs" onClick={removePhoto} aria-label="Supprimer la photo">
                      <X size={14} weight="regular" className="text-destructive" />
                    </Button>
                  </div>
                ) : photoPreview && doc.photo_url ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-20 w-32 overflow-hidden rounded-md border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Photo actuelle" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Changer
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={18} weight="duotone" />
                    Ajouter une photo
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={saving} onClick={() => handleUpdate(doc)}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : confirmDeleteId === doc.id ? (
            /* --- Delete confirmation --- */
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium">Supprimer cette pièce d&apos;identité ?</p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(doc.id, doc.photo_url)}
                >
                  <Trash size={14} weight="duotone" />
                  Supprimer
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            /* --- Display row --- */
            <div className="flex items-start justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <IdentificationCard size={16} weight="duotone" className="text-muted-foreground" />
                  <Badge variant="outline">{documentTypeLabels[doc.document_type] ?? doc.document_type}</Badge>
                  {doc.is_primary && (
                    <Badge variant="secondary" className="text-xs">Principal</Badge>
                  )}
                </div>
                <p className="text-sm font-medium">{doc.document_number}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Émis : {formatDate(doc.issue_date)}</span>
                  <span>Expire : {formatDate(doc.expiry_date)}</span>
                </div>
                {doc.nationality && (
                  <p className="text-xs text-muted-foreground">Nationalité : {doc.nationality}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="inline-flex size-6 items-center justify-center rounded-[min(var(--radius-md),10px)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <DotsThree size={16} weight="regular" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  {doc.photo_url && (
                    <DropdownMenuItem onClick={() => handleViewPhoto(doc.photo_url)}>
                      <Eye size={14} weight="duotone" />
                      Voir la pièce
                    </DropdownMenuItem>
                  )}
                  {!doc.is_primary && (
                    <DropdownMenuItem onClick={() => handleSetPrimary(doc.id)}>
                      <Star size={14} weight="duotone" />
                      Définir comme principal
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => startEdit(doc)}>
                    <PencilSimple size={14} weight="duotone" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDeleteId(doc.id)}
                  >
                    <Trash size={14} weight="duotone" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      ))}

      {showForm ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label>Type de document *</Label>
            <Select value={documentType} onValueChange={(val) => setDocumentType(val ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner">
                  {DOCUMENT_TYPE_OPTIONS.find((o) => o.value === documentType)?.label ?? "Sélectionner"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.document_type && <p className="text-sm text-destructive">{errors.document_type}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Numéro *</Label>
            <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="123456789" />
            {errors.document_number && <p className="text-sm text-destructive">{errors.document_number}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date d&apos;émission</Label>
              <DatePicker value={issueDate} onChange={setIssueDate} placeholder="Sélectionner" />
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;expiration</Label>
              <DatePicker value={expiryDate} onChange={setExpiryDate} placeholder="Sélectionner" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nationalité</Label>
            <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Photo du document</Label>
            {photoPreview ? (
              <div className="flex items-center gap-3">
                <div className="relative h-20 w-32 overflow-hidden rounded-md border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Aperçu" className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <Button variant="ghost" size="icon-xs" onClick={removePhoto} aria-label="Supprimer la photo">
                  <X size={14} weight="regular" className="text-destructive" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={18} weight="duotone" />
                Ajouter une photo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" disabled={saving} onClick={handleAdd}>
              <Plus size={14} weight="bold" />
              {saving ? "Ajout..." : "Ajouter"}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        !editingDocId && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} weight="bold" />
            Ajouter un document
          </Button>
        )
      )}

      {/* Photo viewer modal */}
      {viewingPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewingPhotoUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute -right-2 -top-2 z-10 rounded-full bg-background shadow-md"
              onClick={() => setViewingPhotoUrl(null)}
              aria-label="Fermer"
            >
              <X size={14} weight="regular" />
            </Button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingPhotoUrl}
              alt="Pièce d'identité"
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {/* Loading overlay for photo */}
      {loadingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-lg bg-background px-4 py-3 text-sm shadow-lg">
            Chargement...
          </div>
        </div>
      )}
    </div>
  );
}
