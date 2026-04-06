import { createClient } from "@/lib/supabase/server";
import type { SettingsKey, SettingsMap } from "@/types/settings";

export async function getSettingServer<K extends SettingsKey>(
  key: K
): Promise<SettingsMap[K] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) return null;
  return data.value as SettingsMap[K];
}
