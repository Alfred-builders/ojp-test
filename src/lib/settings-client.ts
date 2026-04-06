import { createClient } from "@/lib/supabase/client";
import type { SettingsKey, SettingsMap } from "@/types/settings";

const cache = new Map<string, { value: unknown; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

export async function getSettingClient<K extends SettingsKey>(
  key: K
): Promise<SettingsMap[K] | null> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.value as SettingsMap[K];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) return null;

  cache.set(key, { value: data.value, ts: Date.now() });
  return data.value as SettingsMap[K];
}
