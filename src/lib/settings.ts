import { createClient } from "@/lib/supabase/server";
import type { SettingsKey, SettingsMap } from "@/types/settings";

export async function getSetting<K extends SettingsKey>(
  key: K
): Promise<SettingsMap[K] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) {
    console.error(`Failed to fetch setting "${key}":`, error);
    return null;
  }
  return data.value as SettingsMap[K];
}

export async function getAllSettings(): Promise<Partial<SettingsMap>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("key, value");

  if (error || !data) {
    console.error("Failed to fetch settings:", error);
    return {};
  }

  const map: Partial<SettingsMap> = {};
  for (const row of data) {
    (map as Record<string, unknown>)[row.key] = row.value;
  }
  return map;
}
