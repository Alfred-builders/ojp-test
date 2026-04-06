"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserPreferences } from "@/types/preferences";

interface ProfileNotificationsSectionProps {
  preferences: UserPreferences;
}

export function ProfileNotificationsSection({ preferences }: ProfileNotificationsSectionProps) {
  const router = useRouter();
  const [inApp, setInApp] = useState(preferences.notif_in_app);
  const [emailDigest, setEmailDigest] = useState(preferences.notif_email_digest);
  const [saving, setSaving] = useState(false);

  const isDirty =
    inApp !== preferences.notif_in_app ||
    emailDigest !== preferences.notif_email_digest;

  async function handleSave() {
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("user_preferences")
      .update({
        notif_in_app: inApp,
        notif_email_digest: emailDigest,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", preferences.user_id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde", {
        description: error.message,
      });
      setSaving(false);
      return;
    }

    toast.success("Preferences de notifications sauvegardees");
    setSaving(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell size={20} weight="duotone" />
          Notifications personnelles
        </CardTitle>
        <CardDescription>
          Choisissez comment vous souhaitez etre notifie. Les types de
          notifications actives sont configures dans les parametres globaux.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Notifications in-app</Label>
            <p className="text-xs text-muted-foreground">
              Afficher les notifications dans la cloche de l&apos;application.
            </p>
          </div>
          <Switch checked={inApp} onCheckedChange={setInApp} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Digest email</Label>
            <p className="text-xs text-muted-foreground">
              Recevoir un resume periodique des notifications par email.
            </p>
          </div>
          <Switch checked={emailDigest} onCheckedChange={setEmailDigest} />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          <FloppyDisk size={16} weight="duotone" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardFooter>
    </Card>
  );
}
