import { createClient } from "@/lib/supabase/server";
import { DOSSIER_WITH_CLIENT } from "@/lib/supabase/queries";
import { DashboardCommandes, type CommandeRow } from "@/components/dashboard/dashboard-commandes";
import { safe, clientName, extractDossier } from "@/components/dashboard/dashboard-helpers";

export async function DashboardCommandesServer() {
  const supabase = await createClient();

  // Commandes
  const commandesRes = await safe(supabase
    .from("vente_lignes")
    .select("id, lot_id, designation, fulfillment, or_investissement_id")
    .not("or_investissement_id", "is", null)
    .in("fulfillment", ["pending", "a_commander", "commande"])
    .limit(10));

  // Wave 2: Dependent query for lots
  const commandeLotIds = [
    ...new Set((commandesRes.data ?? []).map((c) => c.lot_id)),
  ];

  const lotsForCommandesRes = commandeLotIds.length > 0
    ? await supabase
        .from("lots")
        .select(
          `id, numero, ${DOSSIER_WITH_CLIENT}`,
        )
        .in("id", commandeLotIds)
    : { data: [] };

  // --- Transform data ---
  const commandeLotMap = Object.fromEntries(
    (lotsForCommandesRes.data ?? []).map((l: Record<string, unknown>) => [l.id as string, l]),
  );

  const commandes: CommandeRow[] = (commandesRes.data ?? []).map((c) => {
    const lot = commandeLotMap[c.lot_id] as { id: string; numero: string; dossier: unknown } | undefined;
    const dossier = extractDossier(lot?.dossier);
    return {
      id: c.id,
      lotId: c.lot_id,
      lotNumero: (lot?.numero as string) ?? "",
      designation: c.designation,
      clientName: clientName(dossier?.client ?? null),
      fulfillment: c.fulfillment ?? "pending",
    };
  });

  return <DashboardCommandes commandes={commandes} />;
}
