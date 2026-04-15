import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { DOSSIER_WITH_CLIENT } from "@/lib/supabase/queries";
import { generateDocument } from "@/lib/pdf/pdf-actions";
import { formatDate, formatTime } from "@/lib/format";
import type { CommandeLigneFlat } from "@/types/commande";
import type { Fonderie } from "@/types/fonderie";
import type { FulfillmentStatus } from "@/types/vente";

/**
 * Create bons de commande from grouped lines and generate PDFs.
 * Used by commande-ref-table (assign fonderie → generate BDC).
 */
export async function createBonsCommande(params: {
  groups: Map<string, CommandeLigneFlat[]>;
  fonderies: Fonderie[];
}): Promise<{ success: boolean; error?: string }> {
  const { groups, fonderies } = params;
  const supabase = createClient();

  for (const [fonderieId, lignes] of groups) {
    const fonderie = fonderies.find((f) => f.id === fonderieId);
    if (!fonderie) continue;

    const { data: bdc, error: bdcErr } = await mutate(
      supabase
        .from("bons_commande")
        .insert({ fonderie_id: fonderieId, numero: "" })
        .select()
        .single(),
      "Erreur lors de la création du bon de commande",
      "Bon de commande généré"
    );

    if (bdcErr || !bdc) return { success: false, error: bdcErr ?? undefined };

    const ligneIds = lignes.map((l) => l.id);
    const { error: updateErr } = await mutate(
      supabase.from("vente_lignes").update({
        bon_commande_id: bdc.id,
        fonderie_id: fonderieId,
        fulfillment: "commande" as FulfillmentStatus,
      }).in("id", ligneIds),
      "Erreur lors de la mise à jour des lignes de commande",
      "Lignes mises à jour"
    );
    if (updateErr) return { success: false, error: updateErr };

    // Generate PDF
    const firstLigne = lignes[0];
    const { data: lotData } = await supabase
      .from("lots")
      .select(`id, numero, ${DOSSIER_WITH_CLIENT}`)
      .eq("id", firstLigne.lot_id)
      .single();

    if (lotData) {
      const dossier = Array.isArray(lotData.dossier) ? lotData.dossier[0] : lotData.dossier;
      const client = dossier?.client ? (Array.isArray(dossier.client) ? dossier.client[0] : dossier.client) : null;
      const now = new Date();
      const dateStr = formatDate(now.toISOString());

      await generateDocument({
        type: "bon_commande",
        lotId: lotData.id,
        dossierId: dossier?.id ?? "",
        clientId: client?.id ?? "",
        client: {
          civilite: client?.civility === "M" ? "M." : "Mme",
          nom: client?.last_name ?? "",
          prenom: client?.first_name ?? "",
        },
        dossier: {
          numeroDossier: dossier?.numero ?? "",
          numeroLot: lotData.numero,
          date: dateStr,
          heure: formatTime(now),
        },
        references: [],
        totaux: { totalBrut: 0, taxe: 0, netAPayer: 0 },
        fonderie: {
          nom: fonderie.nom,
          adresse: fonderie.adresse ?? undefined,
          codePostal: fonderie.code_postal ?? undefined,
          ville: fonderie.ville ?? undefined,
          telephone: fonderie.telephone ?? undefined,
          email: fonderie.email ?? undefined,
        },
        bonCommandeLignes: lignes.map((l) => ({
          designation: l.designation,
          metal: l.metal ?? "Or",
          poids: l.poids ?? 0,
          quantite: l.quantite,
          prixUnitaire: l.prix_unitaire,
          total: l.prix_total,
        })),
        bonCommandeTotalHT: lignes.reduce((sum, l) => sum + l.prix_total, 0),
      });
    }
  }

  return { success: true };
}

/**
 * Create BDC from simple fonderie groups (used by bons-commande-list ungrouped alert).
 */
export async function createSimpleBDC(group: {
  fonderie_id: string;
  ligne_ids: string[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data: bdc, error } = await mutate(
    supabase
      .from("bons_commande")
      .insert({ fonderie_id: group.fonderie_id, numero: "" })
      .select()
      .single(),
    "Erreur lors de la création du bon de commande",
    "Bon de commande généré"
  );
  if (error || !bdc) return { success: false, error: error ?? undefined };

  const { error: updateErr } = await mutate(
    supabase.from("vente_lignes").update({ bon_commande_id: bdc.id }).in("id", group.ligne_ids),
    "Erreur lors de la mise à jour des lignes",
    "Bon de commande généré"
  );
  if (updateErr) return { success: false, error: updateErr };

  return { success: true };
}
