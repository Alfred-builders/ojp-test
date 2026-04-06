/**
 * Shared helpers for dashboard server components.
 */

// Type helpers for Supabase joined data
export type JoinedClient = {
  id: string;
  civility: string;
  first_name: string;
  last_name: string;
};
export type JoinedDossier = {
  id: string;
  numero: string;
  client: JoinedClient;
};

export function clientName(
  client: {
    civility?: string;
    first_name?: string;
    last_name?: string;
  } | null,
) {
  if (!client) return "\u2014";
  const civ = client.civility === "M" ? "M." : "Mme";
  return `${civ} ${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
}

export function extractDossier(raw: unknown): JoinedDossier | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw as JoinedDossier;
}

export function extractClient(raw: unknown): JoinedClient | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw as JoinedClient;
}

/** Safe query wrapper: prevents a single failure from crashing the whole dashboard */
export const safe = <T,>(
  promise: PromiseLike<{ data: T | null; error: unknown }>,
) =>
  promise.then(
    (res) => ({ data: res.data, error: res.error }),
    () => ({ data: null as T | null, error: "network" as unknown }),
  );
