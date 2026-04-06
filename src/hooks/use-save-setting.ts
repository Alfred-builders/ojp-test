"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { SettingsKey } from "@/types/settings";

interface UseSaveSettingOptions {
  /** Message affiché dans le toast en cas de succès */
  successMessage?: string;
}

interface UseSaveSettingReturn {
  saving: boolean;
  save: (value: unknown) => Promise<boolean>;
}

/**
 * Hook centralisé pour sauvegarder un setting dans Supabase.
 * Gère le loading, les toasts success/error et le router.refresh().
 */
export function useSaveSetting(
  key: SettingsKey,
  options?: UseSaveSettingOptions
): UseSaveSettingReturn {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (value: unknown): Promise<boolean> => {
      setSaving(true);

      const supabase = createClient();
      const { error } = await supabase
        .from("settings")
        .update({ value })
        .eq("key", key);

      if (error) {
        toast.error("Erreur lors de la sauvegarde", {
          description: error.message,
        });
        setSaving(false);
        return false;
      }

      toast.success(options?.successMessage ?? "Paramètres sauvegardés");
      setSaving(false);
      router.refresh();
      return true;
    },
    [key, options?.successMessage, router]
  );

  return { saving, save };
}

/**
 * Hook pour sauvegarder dans la table `parametres` (prix, coefficients).
 */
export function useSaveParametres(successMessage?: string) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (updates: Record<string, unknown>): Promise<boolean> => {
      setSaving(true);

      const supabase = createClient();
      const { error } = await supabase
        .from("parametres")
        .update(updates)
        .eq("id", 1);

      if (error) {
        toast.error("Erreur lors de la sauvegarde", {
          description: error.message,
        });
        setSaving(false);
        return false;
      }

      toast.success(successMessage ?? "Paramètres sauvegardés");
      setSaving(false);
      router.refresh();
      return true;
    },
    [successMessage, router]
  );

  return { saving, save };
}
