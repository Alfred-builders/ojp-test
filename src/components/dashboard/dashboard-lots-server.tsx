import { createClient } from "@/lib/supabase/server";
import { DOSSIER_WITH_CLIENT } from "@/lib/supabase/queries";
import { DashboardLots, type LotRow } from "@/components/dashboard/dashboard-lots";
import { safe, clientName, extractDossier } from "@/components/dashboard/dashboard-helpers";

export async function DashboardLotsServer() {
  const supabase = await createClient();

  // Lots a traiter (statuts non terminaux)
  const lotsATraiterRes = await safe(supabase
    .from("lots")
    .select(
      `id, numero, type, status, created_at, ${DOSSIER_WITH_CLIENT}`,
    )
    .in("status", ["brouillon", "devis_envoye", "accepte", "en_retractation", "en_cours"])
    .order("created_at", { ascending: false })
    .limit(10));

  // Lots vente en_cours pour détecter "all livré"
  const venteLotIds = (lotsATraiterRes.data ?? [])
    .filter((l) => l.type === "vente" && l.status === "en_cours")
    .map((l) => l.id);

  // Lignes de vente pour détecter lots tout-livré
  const venteLignesRes = venteLotIds.length > 0
    ? await supabase
        .from("vente_lignes")
        .select("lot_id, is_livre, fulfillment, or_investissement_id")
        .in("lot_id", venteLotIds)
    : { data: [] };

  // --- Transform data ---
  const lignesByLot = new Map<string, { total: number; livre: number; pending: number; commande: number; recu: number; servi: number }>();
  for (const ligne of (venteLignesRes.data ?? []) as { lot_id: string; is_livre: boolean; fulfillment: string; or_investissement_id: string | null }[]) {
    const entry = lignesByLot.get(ligne.lot_id) ?? { total: 0, livre: 0, pending: 0, commande: 0, recu: 0, servi: 0 };
    entry.total++;
    if (ligne.is_livre) entry.livre++;
    if (ligne.or_investissement_id) {
      if (ligne.fulfillment === "pending" || ligne.fulfillment === "a_commander") entry.pending++;
      else if (ligne.fulfillment === "commande") entry.commande++;
      else if (ligne.fulfillment === "recu") entry.recu++;
      else if (ligne.fulfillment === "servi_stock") entry.servi++;
    }
    lignesByLot.set(ligne.lot_id, entry);
  }

  const lotsATraiter: LotRow[] = (lotsATraiterRes.data ?? []).map((lot) => {
    const dossier = extractDossier(lot.dossier);
    const lignes = lignesByLot.get(lot.id);
    const allLivre = lignes ? lignes.total > 0 && lignes.livre === lignes.total : false;

    // Compute action description
    let action: string | undefined;
    if (lot.type === "vente" && lignes) {
      if (allLivre) {
        action = "Prêt à finaliser — tous les articles livrés";
      } else if (lignes.pending > 0) {
        action = `${lignes.pending} article${lignes.pending > 1 ? "s" : ""} à commander en fonderie`;
      } else if (lignes.commande > 0) {
        action = `${lignes.commande} article${lignes.commande > 1 ? "s" : ""} en attente de réception fonderie`;
      } else if (lignes.livre < lignes.total) {
        const restant = lignes.total - lignes.livre;
        action = `${restant} article${restant > 1 ? "s" : ""} à livrer au client`;
      }
    } else if (lot.type === "vente" && lot.status === "brouillon") {
      action = "Lot en brouillon — à valider";
    } else if (lot.type === "rachat") {
      if (lot.status === "en_cours") {
        action = "En cours de traitement";
      } else if (lot.status === "brouillon") {
        action = "Lot en brouillon — à valider";
      }
    } else if (lot.type === "depot_vente") {
      if (lot.status === "brouillon") {
        action = "Lot en brouillon — à valider";
      }
    }

    return {
      id: lot.id,
      numero: lot.numero,
      type: lot.type,
      status: lot.status,
      clientName: clientName(dossier?.client ?? null),
      createdAt: lot.created_at,
      allLivre,
      action,
    };
  });

  return <DashboardLots lots={lotsATraiter} />;
}
