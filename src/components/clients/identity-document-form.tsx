"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Trash, IdentificationCard } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { identityDocumentSchema, DOCUMENT_TYPE_OPTIONS } from "@/lib/validations/client";
import type { ClientIdentityDocument } from "@/types/client";

const documentTypeLabels: Record<string, string> = {
  cni: "CNI",
  passeport: "Passeport",
  titre_sejour: "Titre de séjour",
  permis_conduire: "Permis de conduire",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function IdentityDocumentSection({
  clientId,
  documents,
}: {
  clientId: string;
  documents: ClientIdentityDocument[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState<Date | undefined>(undefined);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [nationality, setNationality] = useState("Française");

  function resetForm() {
    setDocumentType("");
    setDocumentNumber("");
    setIssueDate(undefined);
    setExpiryDate(undefined);
    setNationality("Française");
    setErrors({});
    setShowForm(false);
  }

  async function handleAdd() {
    const issueDateStr = issueDate ? format(issueDate, "yyyy-MM-dd") : "";
    const expiryDateStr = expiryDate ? format(expiryDate, "yyyy-MM-dd") : "";

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
    await supabase.from("client_identity_documents").insert({
      client_id: clientId,
      document_type: documentType,
      document_number: documentNumber,
      issue_date: issueDateStr || null,
      expiry_date: expiryDateStr || null,
      nationality: nationality || null,
      is_primary: documents.length === 0,
    });

    setSaving(false);
    resetForm();
    router.refresh();
  }

  async function handleDelete(docId: string) {
    const supabase = createClient();
    await supabase
      .from("client_identity_documents")
      .delete()
      .eq("id", docId);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Aucune pièce d&apos;identité enregistrée.</p>
      )}

      {documents.map((doc) => (
        <div key={doc.id} className="flex items-start justify-between rounded-lg border p-3">
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
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleDelete(doc.id)}
          >
            <Trash size={14} weight="duotone" className="text-destructive" />
          </Button>
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
              <DatePicker
                value={issueDate}
                onChange={setIssueDate}
                placeholder="Sélectionner"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;expiration</Label>
              <DatePicker
                value={expiryDate}
                onChange={setExpiryDate}
                placeholder="Sélectionner"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nationalité</Label>
            <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" disabled={saving} onClick={handleAdd}>
              <Plus size={14} weight="regular" />
              {saving ? "Ajout..." : "Ajouter"}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} weight="regular" />
          Ajouter un document
        </Button>
      )}
    </div>
  );
}
