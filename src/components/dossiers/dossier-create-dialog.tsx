"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderPlus,
  User as PhUser,
  Plus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import { ClientCreateDialog } from "@/components/clients/client-create-dialog";
import type { Client } from "@/types/client";

interface DossierCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validClients: Client[];
}

export function DossierCreateDialog({ open, onOpenChange, validClients: initialClients }: DossierCreateDialogProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState(initialClients);
  const [showClientCreate, setShowClientCreate] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId) ?? null;

  function handleClose() {
    setClientId("");
    setError("");
    onOpenChange(false);
  }

  function handleClientCreated(newClient: Client) {
    setClients((prev) => [...prev, newClient]);
    setClientId(newClient.id);
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
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
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
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
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
                      setShowClientCreate(true);
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
      </Dialog>
      <ClientCreateDialog
        open={showClientCreate}
        onOpenChange={setShowClientCreate}
        onClientCreated={handleClientCreated}
      />
    </>
  );
}
