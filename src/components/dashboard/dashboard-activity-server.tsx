import { createClient } from "@/lib/supabase/server";
import { DOSSIER_WITH_CLIENT } from "@/lib/supabase/queries";
import { DashboardActivity, type ActivityEvent } from "@/components/dashboard/dashboard-activity";
import { safe, clientName, extractDossier, extractClient } from "@/components/dashboard/dashboard-helpers";

export async function DashboardActivityServer() {
  const supabase = await createClient();

  const [activityLotsRes, activityDossiersRes, activityDocsRes] =
    await Promise.all([
      // Activite: Lots finalises/termines
      safe(supabase
        .from("lots")
        .select(
          `id, numero, status, updated_at, ${DOSSIER_WITH_CLIENT}`,
        )
        .in("status", ["finalise", "termine"])
        .order("updated_at", { ascending: false })
        .limit(10)),
      // Activite: Nouveaux dossiers
      safe(supabase
        .from("dossiers")
        .select("id, numero, created_at, client:clients(id, first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(10)),
      // Activite: Documents recents
      safe(supabase
        .from("documents")
        .select("id, type, numero, lot_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10)),
    ]);

  // --- Transform data ---
  const activityEvents: ActivityEvent[] = [];

  for (const lot of activityLotsRes.data ?? []) {
    const dossier = extractDossier(lot.dossier);
    const client = dossier?.client;
    activityEvents.push({
      id: `lot-${lot.id}`,
      type: "lot_finalise",
      description: `${lot.numero} ${lot.status === "termine" ? "terminé" : "finalisé"} — ${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim(),
      date: lot.updated_at,
      link: `/lots/${lot.id}`,
    });
  }

  for (const d of activityDossiersRes.data ?? []) {
    const client = extractClient(d.client);
    activityEvents.push({
      id: `dossier-${d.id}`,
      type: "nouveau_dossier",
      description: `Nouveau dossier ${d.numero} — ${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim(),
      date: d.created_at,
      link: `/dossiers/${d.id}`,
    });
  }

  for (const doc of activityDocsRes.data ?? []) {
    const typeLabels: Record<string, string> = {
      quittance_rachat: "Quittance",
      contrat_rachat: "Contrat rachat",
      devis_rachat: "Devis",
      contrat_depot_vente: "Contrat dépôt-vente",
      confie_achat: "Confié achat",
    };
    activityEvents.push({
      id: `doc-${doc.id}`,
      type: "document_genere",
      description: `${typeLabels[doc.type] ?? doc.type} ${doc.numero} généré`,
      date: doc.created_at,
      link: doc.lot_id ? `/lots/${doc.lot_id}` : "#",
    });
  }

  // Sort by date desc and take 10
  activityEvents.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const recentActivity = activityEvents.slice(0, 10);

  return <DashboardActivity events={recentActivity} />;
}
