"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderPlus,
  User as PhUser,
  Plus,
  MapPin as PhMapPin,
  Info as PhInfo,
  IdentificationCard as PhIdCard,
  FloppyDisk,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clientSchema, LEAD_SOURCE_OPTIONS, DOCUMENT_TYPE_OPTIONS } from "@/lib/validations/client";
import type { Client } from "@/types/client";

interface DossierCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validClients: Client[];
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-150">{error}</p>}
    </div>
  );
}

export function DossierCreateDialog({ open, onOpenChange, validClients: initialClients }: DossierCreateDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "create-client">("select");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState(initialClients);

  // Client creation form state
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [civility, setCivility] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [maidenName, setMaidenName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("France");
  const [leadSource, setLeadSource] = useState("");
  const [notes, setNotes] = useState("");

  // Identity document state
  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");

  const selectedClient = clients.find((c) => c.id === clientId) ?? null;

  function resetClientForm() {
    setClientErrors({});
    setCivility("");
    setFirstName("");
    setLastName("");
    setDocType("");
    setDocNumber("");
    setMaidenName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setCity("");
    setPostalCode("");
    setCountry("France");
    setLeadSource("");
    setNotes("");
  }

  function handleClose() {
    setClientId("");
    setError("");
    setStep("select");
    resetClientForm();
    onOpenChange(false);
  }

  async function handleCreateClient() {
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
    const fieldErrors: Record<string, string> = {};
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
    }

    // Validate identity document
    if (!docType) fieldErrors.doc_type = "Le type de document est requis";
    if (!docNumber) fieldErrors.doc_number = "Le numéro de document est requis";

    if (Object.keys(fieldErrors).length > 0) {
      setClientErrors(fieldErrors);
      return;
    }

    setClientErrors({});
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("clients")
      .insert({
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
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setSaving(false);
      toast.error("Erreur lors de la création du client");
      return;
    }

    // Insert identity document
    const { error: docError } = await supabase
      .from("client_identity_documents")
      .insert({
        client_id: data.id,
        document_type: docType,
        document_number: docNumber,
        is_primary: true,
      });

    if (docError) {
      setSaving(false);
      toast.error("Client créé mais erreur lors de l'ajout de la pièce d'identité");
      return;
    }

    // is_valid is auto-set by trigger when identity document is inserted
    toast.success("Client créé");
    setClients((prev) => [...prev, { ...data, is_valid: true } as Client]);
    setClientId(data.id);
    resetClientForm();
    setStep("select");
  }

  async function handleCreateDossier() {
    if (!clientId) {
      setError("Veuillez sélectionner un client");
      return;
    }
    setError("");
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("dossiers")
      .insert({
        numero: "",
        client_id: clientId,
        created_by: user?.id ?? "",
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      toast.error("Erreur lors de la création du dossier");
      return;
    }

    handleClose();
    toast.success("Dossier créé");
    router.push(`/dossiers/${data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { if (step === "create-client") { resetClientForm(); setStep("select"); return; } handleClose(); } }}>
      {step === "select" ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus size={20} weight="duotone" />
              Nouveau dossier
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un client pour créer un nouveau dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <p className="text-xs text-muted-foreground">
                Seuls les clients avec une pièce d&apos;identité valide sont affichés.
              </p>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  {selectedClient
                    ? <span className="truncate">{`${selectedClient.civility === "M" ? "M." : "Mme"} ${selectedClient.first_name} ${selectedClient.last_name}`}</span>
                    : <SelectValue placeholder="Sélectionner un client" />}
                </SelectTrigger>
                <SelectContent>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent cursor-pointer"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setStep("create-client");
                    }}
                  >
                    <Plus size={14} weight="bold" />
                    Nouveau client
                  </button>
                  <div className="my-1 h-px bg-border" />
                  {clients.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Aucun client valide disponible.
                    </div>
                  ) : (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {`${client.civility === "M" ? "M." : "Mme"} ${client.first_name} ${client.last_name}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {error && <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-150">{error}</p>}
            </div>
            {selectedClient && (
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <PhUser size={14} weight="duotone" />
                  Infos client
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span>{selectedClient.phone ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span>{selectedClient.email ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ville</span>
                  <span>{selectedClient.city ?? "—"}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleClose}>
              Annuler
            </Button>
            <Button size="sm" disabled={saving} onClick={handleCreateDossier}>
              <FolderPlus size={14} weight="duotone" />
              {saving ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent className="sm:max-w-[calc(100vw-4rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhUser size={20} weight="duotone" />
              Nouveau client
            </DialogTitle>
            <DialogDescription>
              Créez un nouveau client qui sera automatiquement sélectionné pour le dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 py-2">
            {clientErrors._form && (
              <p className="text-sm text-destructive md:col-span-2 animate-in fade-in-0 slide-in-from-top-1 duration-150">{clientErrors._form}</p>
            )}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PhUser size={18} weight="duotone" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField label="Civilité *" error={clientErrors.civility}>
                  <Select value={civility} onValueChange={setCivility}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Monsieur</SelectItem>
                      <SelectItem value="Mme">Madame</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Prénom *" error={clientErrors.first_name}>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jean" />
                </FormField>
                <FormField label="Nom *" error={clientErrors.last_name}>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" />
                </FormField>
                <FormField label="Nom de jeune fille" error={clientErrors.maiden_name}>
                  <Input value={maidenName} onChange={(e) => setMaidenName(e.target.value)} />
                </FormField>
                <FormField label="Email" error={clientErrors.email}>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@exemple.fr" />
                </FormField>
                <FormField label="Téléphone" error={clientErrors.phone}>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
                </FormField>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PhIdCard size={18} weight="duotone" />
                    Pièce d&apos;identité *
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FormField label="Type de document *" error={clientErrors.doc_type}>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Numéro *" error={clientErrors.doc_number}>
                    <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="N° du document" />
                  </FormField>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PhMapPin size={18} weight="duotone" />
                    Adresse
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FormField label="Adresse" error={clientErrors.address}>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 rue de la Paix" />
                  </FormField>
                  <FormField label="Code postal" error={clientErrors.postal_code}>
                    <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="75001" />
                  </FormField>
                  <FormField label="Ville" error={clientErrors.city}>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
                  </FormField>
                  <FormField label="Pays" error={clientErrors.country}>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                  </FormField>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PhInfo size={18} weight="duotone" />
                    Complémentaire
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FormField label="Source" error={clientErrors.lead_source}>
                    <Select value={leadSource} onValueChange={setLeadSource}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une source" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCE_OPTIONS.map((src) => (
                          <SelectItem key={src} value={src}>{src}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Notes" error={clientErrors.notes}>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes additionnelles..."
                      className="min-h-[80px] resize-none"
                    />
                  </FormField>
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { resetClientForm(); setStep("select"); }}>
              Retour
            </Button>
            <Button size="sm" disabled={saving} onClick={handleCreateClient}>
              <FloppyDisk size={14} weight="duotone" />
              {saving ? "Création..." : "Ajouter le client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
