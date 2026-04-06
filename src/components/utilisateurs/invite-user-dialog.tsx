"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EnvelopeSimple,
  Key,
  UserPlus,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"invite" | "create">("invite");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setError(null);
    setSuccess(false);
    setMode("invite");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, mode, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      setSuccess(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vendeur invité</DialogTitle>
            <DialogDescription>
              {mode === "invite"
                ? `Un email d'invitation a été envoyé à ${email}. Le vendeur pourra créer son mot de passe en cliquant sur le lien.`
                : `Le compte de ${firstName} ${lastName} a été créé. Communiquez-lui ses identifiants : ${email} / ${password}`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => handleClose(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={20} weight="duotone" />
            Inviter un vendeur
          </DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau vendeur à votre établissement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "invite" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("invite")}
            >
              <EnvelopeSimple size={14} weight="duotone" />
              Invitation email
            </Button>
            <Button
              type="button"
              variant={mode === "create" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("create")}
            >
              <Key size={14} weight="duotone" />
              Création manuelle
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe temporaire</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caractères"
                required
                minLength={6}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              <UserPlus size={14} weight="duotone" />
              {submitting
                ? "Envoi..."
                : mode === "invite"
                  ? "Envoyer l'invitation"
                  : "Créer le compte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
