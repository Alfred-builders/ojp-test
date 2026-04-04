import { createClient } from "@/lib/supabase/server";
import type { Parametres } from "@/types/parametres";

const DEFAULT_PARAMETRES: Parametres = {
  id: 1,
  prix_or: 0,
  prix_argent: 0,
  prix_platine: 0,
  coefficient_rachat: 0.85,
  coefficient_vente: 1.05,
  updated_at: new Date().toISOString(),
};

export async function getParametres(): Promise<Parametres> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parametres")
    .select("*")
    .eq("id", 1)
    .single();
  return (data as Parametres) ?? DEFAULT_PARAMETRES;
}
