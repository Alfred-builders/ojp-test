import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { generateBonLivraison } from "@/lib/pdf/pdf-actions";
import { formatDate } from "@/lib/format";
import type { BijouxStock } from "@/types/bijoux";
import type { Fonderie } from "@/types/fonderie";
import type { BonLivraisonGroupData } from "@/lib/pdf/blocks";

interface CoursMap {
  [metal: string]: number;
}

async function fetchCours(): Promise<CoursMap> {
  const supabase = createClient();
  const { data: parametres } = await supabase
    .from("parametres")
    .select("prix_or, prix_argent, prix_platine")
    .eq("id", 1)
    .single();

  return {
    Or: parametres?.prix_or ?? 0,
    Argent: parametres?.prix_argent ?? 0,
    Platine: parametres?.prix_platine ?? 0,
  };
}

function buildLignesPayload(
  bdlId: string,
  items: BijouxStock[],
  coursMap: CoursMap
) {
  return items.map((item) => {
    const coursMetal = coursMap[item.metaux ?? ""] ?? 0;
    const titrage = parseInt(item.qualite ?? "0") || 0;
    const coursGramme = coursMetal * (titrage / 1000);
    const valeur = (item.poids_net ?? item.poids ?? 0) * coursGramme;

    return {
      bon_livraison_id: bdlId,
      bijoux_stock_id: item.id,
      designation: item.nom,
      metal: item.metaux,
      titrage_declare: item.qualite,
      poids_declare: item.poids_net ?? item.poids,
      cours_utilise: Math.round(coursGramme * 100) / 100,
      valeur_estimee: Math.round(valeur * 100) / 100,
    };
  });
}

function buildGroupes(lignesPayload: ReturnType<typeof buildLignesPayload>) {
  const groupMap = new Map<string, BonLivraisonGroupData>();
  for (const lp of lignesPayload) {
    const key = `${lp.metal ?? "Autre"}-${lp.titrage_declare ?? "?"}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        metal: lp.metal ?? "Autre",
        titrage: lp.titrage_declare ?? "?",
        lignes: [],
        sousTotal: { pieces: 0, poids: 0, valeur: 0 },
      });
    }
    const group = groupMap.get(key)!;
    group.lignes.push({
      designation: lp.designation,
      metal: lp.metal ?? "",
      titrage: lp.titrage_declare ?? "",
      poids: lp.poids_declare ?? 0,
      cours: lp.cours_utilise ?? 0,
      valeur: lp.valeur_estimee ?? 0,
    });
    group.sousTotal.pieces += 1;
    group.sousTotal.poids += lp.poids_declare ?? 0;
    group.sousTotal.valeur += lp.valeur_estimee ?? 0;
  }
  return Array.from(groupMap.values());
}

/**
 * Create a single bon de livraison for one fonderie with the given items.
 * Handles: insert BDL, insert lignes, mark stock as fondu, generate PDF.
 */
export async function createBonLivraison(params: {
  fonderieId: string;
  items: BijouxStock[];
  fonderie: Fonderie;
  coursMap?: CoursMap;
}): Promise<{ bdlId: string } | { error: string }> {
  const { fonderieId, items, fonderie, coursMap: providedCours } = params;
  const supabase = createClient();
  const coursMap = providedCours ?? await fetchCours();

  // Create BDL
  const { data: bdl, error: bdlError } = await mutate(
    supabase
      .from("bons_livraison")
      .insert({ fonderie_id: fonderieId, numero: "" })
      .select()
      .single(),
    "Erreur lors de la création du bon de livraison",
    "Bon de livraison généré"
  );
  if (bdlError || !bdl) return { error: bdlError ?? "Erreur inconnue" };

  // Insert lignes
  const lignesPayload = buildLignesPayload(bdl.id, items, coursMap);
  const { error: lignesError } = await mutate(
    supabase.from("bon_livraison_lignes").insert(lignesPayload),
    "Erreur lors de la création des lignes du bon de livraison",
    "Lignes créées"
  );
  if (lignesError) return { error: lignesError };

  // Mark stock items as fondu
  const { error: stockError } = await mutate(
    supabase
      .from("bijoux_stock")
      .update({ statut: "fondu" })
      .in("id", items.map((i) => i.id)),
    "Erreur lors de la mise à jour du statut des articles",
    "Statut des articles mis à jour"
  );
  if (stockError) return { error: stockError };

  // Generate PDF
  const groupes = buildGroupes(lignesPayload);
  const poidsTotal = lignesPayload.reduce((s, l) => s + (l.poids_declare ?? 0), 0);
  const valeurEstimee = lignesPayload.reduce((s, l) => s + (l.valeur_estimee ?? 0), 0);

  await generateBonLivraison(bdl.id, {
    date: formatDate(new Date().toISOString()),
    fonderie: {
      nom: fonderie.nom,
      adresse: fonderie.adresse ?? undefined,
      codePostal: fonderie.code_postal ?? undefined,
      ville: fonderie.ville ?? undefined,
      telephone: fonderie.telephone ?? undefined,
      email: fonderie.email ?? undefined,
    },
    groupes,
    poidsTotal,
    valeurEstimee,
  });

  return { bdlId: bdl.id };
}

/**
 * Create multiple BDLs from fonderie-grouped assignments.
 * Used by bons-livraison-list (assign fonderie per item → generate BDLs).
 */
export async function createBonsLivraison(params: {
  groups: Map<string, BijouxStock[]>;
  fonderies: Fonderie[];
}): Promise<{ success: boolean; error?: string }> {
  const { groups, fonderies } = params;
  const coursMap = await fetchCours();

  for (const [fonderieId, items] of groups) {
    const fonderie = fonderies.find((f) => f.id === fonderieId);
    if (!fonderie) continue;
    const result = await createBonLivraison({ fonderieId, items, fonderie, coursMap });
    if ("error" in result) return { success: false, error: result.error };
  }

  return { success: true };
}
