"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Robot,
  UsersThree,
  Plus,
  X,
  FolderOpen,
  Package,
  ShoppingCart,
  Gear,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useSaveSetting } from "@/hooks/use-save-setting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import type { NotificationsSettings } from "@/types/settings";
import type { AppNotificationType } from "@/types/notification";

interface NotificationsTabProps {
  settings: NotificationsSettings;
  onRegisterSave?: (fn: () => Promise<boolean>) => void;
}

interface NotificationGroup {
  label: string;
  icon: React.ReactNode;
  types: { key: AppNotificationType; label: string }[];
}

const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    label: "Dossiers",
    icon: <FolderOpen size={14} weight="duotone" />,
    types: [
      { key: "dossier_created", label: "Dossier créé" },
      { key: "dossier_finalized", label: "Dossier finalisé" },
    ],
  },
  {
    label: "Lots",
    icon: <Package size={14} weight="duotone" />,
    types: [
      { key: "lot_accepted", label: "Lot accepté" },
      { key: "lot_finalized", label: "Lot finalisé" },
      { key: "lot_retracted", label: "Lot rétracté" },
    ],
  },
  {
    label: "Ventes & Commandes",
    icon: <ShoppingCart size={14} weight="duotone" />,
    types: [
      { key: "vente_created", label: "Vente créée" },
      { key: "vente_finalized", label: "Vente finalisée" },
      { key: "commande_received", label: "Commande reçue" },
    ],
  },
  {
    label: "Autres",
    icon: <Gear size={14} weight="duotone" />,
    types: [
      { key: "client_created", label: "Client créé" },
      { key: "system", label: "Système" },
    ],
  },
];

const CRON_OPTIONS = [
  { value: "5min", label: "5 minutes" },
  { value: "15min", label: "15 minutes" },
  { value: "30min", label: "30 minutes" },
  { value: "1h", label: "1 heure" },
  { value: "2h", label: "2 heures" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NotificationsTab({ settings, onRegisterSave }: NotificationsTabProps) {
  const [form, setForm] = useState<NotificationsSettings>(settings);
  const [newEmail, setNewEmail] = useState("");
  const { save } = useSaveSetting("notifications", {
    successMessage: "Paramètres de notifications sauvegardés",
  });

  function toggleType(type: AppNotificationType) {
    setForm((prev) => ({
      ...prev,
      types: { ...prev.types, [type]: !prev.types[type] },
    }));
  }

  function addEmail() {
    const email = newEmail.trim();
    if (!email) return;

    if (!EMAIL_REGEX.test(email)) {
      toast.error("Adresse email invalide", {
        description: "Veuillez saisir une adresse email valide.",
      });
      return;
    }

    if (form.emails_internes.includes(email)) {
      toast.error("Email déjà ajouté");
      return;
    }

    setForm((prev) => ({
      ...prev,
      emails_internes: [...prev.emails_internes, email],
    }));
    setNewEmail("");
  }

  function removeEmail(email: string) {
    setForm((prev) => ({
      ...prev,
      emails_internes: prev.emails_internes.filter((e) => e !== email),
    }));
  }

  const doSave = useCallback(async () => {
    const success = await save(form);
    if (success) toast.success("Paramètres sauvegardés");
    return success;
  }, [form, save]);

  useEffect(() => {
    onRegisterSave?.(doSave);
  }, [doSave, onRegisterSave]);

  return (
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Card Notifications actives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={20} weight="duotone" />
              Notifications actives
            </CardTitle>
            <CardDescription>
              Activez ou désactivez chaque type de notification dans
              l&apos;application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {NOTIFICATION_GROUPS.map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.icon}
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.types.map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-1.5 pl-2"
                      >
                        <Label htmlFor={`notif-${key}`} className="text-sm">
                          {label}
                        </Label>
                        <Switch
                          id={`notif-${key}`}
                          checked={form.types[key] ?? true}
                          onCheckedChange={() => toggleType(key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card Automatismes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Robot size={20} weight="duotone" />
              Automatismes
            </CardTitle>
            <CardDescription>
              Fréquence des tâches automatisées en arrière-plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="space-y-2">
                <Label>Vérification lots finalisables</Label>
                <Select
                  value={form.cron_lots_finalisables}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      cron_lots_finalisables: String(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vérification acomptes expirés</Label>
                <Select
                  value={form.cron_acompte_expire}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      cron_acompte_expire: String(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRON_OPTIONS.map((opt) => (
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

        {/* Card Destinataires internes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersThree size={20} weight="duotone" />
              Destinataires internes
            </CardTitle>
            <CardDescription>
              Adresses email qui reçoivent les notifications internes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmail();
                  }
                }}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={addEmail}
                      >
                        <Plus size={16} weight="bold" />
                      </Button>
                    }
                  />
                  <TooltipContent>Ajouter un destinataire</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {form.emails_internes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.emails_internes.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} weight="regular" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun destinataire configuré.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
