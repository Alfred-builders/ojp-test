import { createClient } from "@/lib/supabase/server";
import { DashboardKpis, type KpiData } from "@/components/dashboard/dashboard-kpis";
import { safe } from "@/components/dashboard/dashboard-helpers";
import type { UserRole } from "@/types/auth";

export async function DashboardKpisServer({ role }: { role: UserRole }) {
  const supabase = await createClient();

  // --- Date boundaries ---
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

  const [
    caMonthRes,
    caLastMonthRes,
    margeMonthRes,
    margeLastMonthRes,
    stockBijouxRes,
    stockOrRes,
    aReglerLotsRes,
  ] = await Promise.all([
    // KPI 1: CA du mois
    safe(supabase
      .from("factures")
      .select("montant_ttc")
      .gte("date_emission", startOfMonth)),
    // KPI 1: CA mois precedent
    safe(supabase
      .from("factures")
      .select("montant_ttc")
      .gte("date_emission", startOfLastMonth)
      .lte("date_emission", endOfLastMonth)),
    // KPI 2: Marge brute mois
    safe(supabase
      .from("lots")
      .select("marge_brute")
      .eq("type", "rachat")
      .in("status", ["finalise"])
      .gte("date_finalisation", startOfMonth)),
    // KPI 2: Marge brute mois precedent
    safe(supabase
      .from("lots")
      .select("marge_brute")
      .eq("type", "rachat")
      .in("status", ["finalise"])
      .gte("date_finalisation", startOfLastMonth)
      .lte("date_finalisation", endOfLastMonth)),
    // KPI 3: Valeur stock bijoux
    safe(supabase
      .from("bijoux_stock")
      .select("prix_revente")
      .in("statut", ["en_stock", "en_depot_vente"])),
    // KPI 3: Valeur stock or investissement
    safe(supabase
      .from("or_investissement")
      .select("prix_revente, quantite")),
    // KPI 4: Lots vente en cours (pour factures)
    safe(supabase
      .from("lots")
      .select("id")
      .eq("type", "vente")
      .eq("status", "en_cours")),
  ]);

  // --- Wave 2: Dependent query ---
  const aReglerLotIds = (aReglerLotsRes.data ?? []).map((l) => l.id);

  const facturesAttenteRes = aReglerLotIds.length > 0
    ? await supabase
        .from("factures")
        .select("montant_ttc")
        .in("lot_id", aReglerLotIds)
    : { data: [] };

  // --- Transform data ---
  const sum = (items: { montant_ttc?: number; marge_brute?: number }[] | null, field: string) =>
    (items ?? []).reduce((acc, i) => acc + (Number((i as Record<string, unknown>)[field]) || 0), 0);

  const caMonth = sum(caMonthRes.data, "montant_ttc");
  const caLastMonth = (caLastMonthRes.data ?? []).length > 0 ? sum(caLastMonthRes.data, "montant_ttc") : null;
  const margeBrute = sum(margeMonthRes.data, "marge_brute");
  const margeBruteLastMonth =
    (margeLastMonthRes.data ?? []).length > 0 ? sum(margeLastMonthRes.data, "marge_brute") : null;

  const valeurStockBijoux = (stockBijouxRes.data ?? []).reduce(
    (acc, i) => acc + (Number(i.prix_revente) || 0),
    0,
  );
  const valeurStockOr = (stockOrRes.data ?? []).reduce(
    (acc, i) => acc + (Number(i.prix_revente) || 0) * (Number(i.quantite) || 0),
    0,
  );

  const montantAttente = sum(facturesAttenteRes.data as { montant_ttc?: number }[] | null, "montant_ttc");

  const kpiData: KpiData = {
    caMonth,
    caLastMonth,
    margeBrute,
    margeBruteLastMonth,
    valeurStock: valeurStockBijoux + valeurStockOr,
    montantAttente,
  };

  return <DashboardKpis data={kpiData} role={role} />;
}
