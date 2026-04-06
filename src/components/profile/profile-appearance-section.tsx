"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  PaintBrush,
  Sun,
  Moon,
  Desktop,
  Sidebar,
  FloppyDisk,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserPreferences } from "@/types/preferences";

interface ProfileAppearanceSectionProps {
  preferences: UserPreferences;
}

export function ProfileAppearanceSection({ preferences }: ProfileAppearanceSectionProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(preferences.sidebar_default_open);
  const [itemsPerPage, setItemsPerPage] = useState(preferences.items_per_page);
  const [saving, setSaving] = useState(false);

  const [initial, setInitial] = useState({
    sidebar_default_open: preferences.sidebar_default_open,
    items_per_page: preferences.items_per_page,
  });

  const isDirty =
    sidebarOpen !== initial.sidebar_default_open ||
    itemsPerPage !== initial.items_per_page;

  async function handleSave() {
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("user_preferences")
      .update({
        sidebar_default_open: sidebarOpen,
        items_per_page: itemsPerPage,
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

    setInitial({ sidebar_default_open: sidebarOpen, items_per_page: itemsPerPage });
    toast.success("Preferences d'affichage sauvegardees");
    setSaving(false);
    router.refresh();
  }

  async function handleThemeChange(value: string) {
    setTheme(value);

    const supabase = createClient();
    await supabase
      .from("user_preferences")
      .update({ theme: value, updated_at: new Date().toISOString() })
      .eq("user_id", preferences.user_id);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaintBrush size={20} weight="duotone" />
            Theme
          </CardTitle>
          <CardDescription>
            Choisissez le theme de l&apos;application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", label: "Clair", icon: <Sun size={24} weight="duotone" /> },
              { value: "dark", label: "Sombre", icon: <Moon size={24} weight="duotone" /> },
              { value: "system", label: "Systeme", icon: <Desktop size={24} weight="duotone" /> },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleThemeChange(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-lg p-4 transition-all cursor-pointer",
                  theme === opt.value
                    ? "bg-primary/5 shadow-sm ring-2 ring-primary"
                    : "shadow-sm hover:shadow-md hover:ring-1 hover:ring-foreground/10"
                )}
              >
                {opt.icon}
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sidebar size={20} weight="duotone" />
            Interface
          </CardTitle>
          <CardDescription>
            Preferences d&apos;affichage de l&apos;interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Sidebar ouverte par defaut</Label>
              <p className="text-xs text-muted-foreground">
                La barre laterale sera deployee au chargement de la page.
              </p>
            </div>
            <Switch
              checked={sidebarOpen}
              onCheckedChange={setSidebarOpen}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Elements par page</Label>
              <p className="text-xs text-muted-foreground">
                Nombre de lignes affichees dans les tableaux.
              </p>
            </div>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(v) => setItemsPerPage(parseInt(String(v)))}
            >
              <SelectTrigger className="w-full max-w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
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
    </div>
  );
}
