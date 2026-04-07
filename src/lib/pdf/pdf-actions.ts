"use server";

import {
  generateAndStoreDocument,
  generateAndStoreBonLivraison,
} from "./generate-and-store";
import type { GenerateDocumentParams } from "./generate-and-store";
import type { BonLivraisonData } from "./bon-livraison";
import { createClient } from "@/lib/supabase/server";
import { getSettingServer } from "@/lib/settings-server";
import { formatDate, formatTime } from "@/lib/format";
import type { FactureVenteLigne } from "./blocks";

export async function generateDocument(
  params: GenerateDocumentParams
): Promise<string | null> {
  return generateAndStoreDocument(params);
}

export async function generateBonLivraison(
  bonLivraisonId: string,
  data: Omit<BonLivraisonData, "numero">
): Promise<string | null> {
  return generateAndStoreBonLivraison(bonLivraisonId, data);
}

/**
 * Generate all factures for a vente lot when it transitions to en_cours.
 * - facture_vente (bijoux lines)
 * - facture_acompte + facture_solde (or investissement lines)
 */
export async function generateVenteFactures(lotId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch lot with dossier + client
  const { data: lot } = await supabase
    .from("lots")
    .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name, address, postal_code, city))")
    .eq("id", lotId)
    .single();

  if (!lot?.dossier) return { success: false, error: "Lot ou dossier introuvable" };

  // Fetch vente lignes
  const { data: lignes } = await supabase
    .from("vente_lignes")
    .select("*")
    .eq("lot_id", lotId)
    .order("created_at", { ascending: true });

  if (!lignes || lignes.length === 0) return { success: false, error: "Aucune ligne de vente" };

  const dossierData = lot.dossier as unknown as {
    id: string; numero: string;
    client: { id: string; civility: string; first_name: string; last_name: string; address: string | null; postal_code: string | null; city: string | null };
  };
  const client = dossierData.client;

  const now = new Date();
  const clientInfo = {
    civilite: client.civility === "M" ? "M." : "Mme",
    nom: client.last_name,
    prenom: client.first_name,
    adresse: client.address ?? undefined,
    codePostal: client.postal_code ?? undefined,
    ville: client.city ?? undefined,
  };
  const dossierInfo = {
    numeroDossier: dossierData.numero,
    numeroLot: lot.numero,
    date: formatDate(now.toISOString()),
    heure: formatTime(now),
  };

  const bijouxLignes = lignes.filter((l: { or_investissement_id: string | null }) => !l.or_investissement_id);
  const orInvestLignes = lignes.filter((l: { or_investissement_id: string | null }) => !!l.or_investissement_id);

  // Build FactureVenteLigne from vente_lignes
  function buildFactureLignes(lines: typeof lignes): FactureVenteLigne[] {
    return lines.map((l) => ({
      titre: l.designation ?? "Article",
      designation: l.designation ?? "",
      poids: l.poids ?? 0,
      quantite: l.quantite ?? 1,
      prixUnitaireHT: l.prix_unitaire ?? 0,
      totalHT: l.prix_total ?? 0,
    }));
  }

  // --- Facture de vente (bijoux) ---
  if (bijouxLignes.length > 0) {
    const totalHT = bijouxLignes.reduce((s: number, l: { prix_total: number }) => s + l.prix_total, 0);
    const tva = bijouxLignes.reduce((s: number, l: { montant_taxe: number }) => s + l.montant_taxe, 0);
    const totalTTC = totalHT + tva;

    await generateAndStoreDocument({
      type: "facture_vente",
      lotId,
      dossierId: dossierData.id,
      clientId: client.id,
      client: clientInfo,
      dossier: dossierInfo,
      references: [],
      totaux: { totalBrut: totalHT, taxe: tva, netAPayer: totalTTC },
      factureVenteLignes: buildFactureLignes(bijouxLignes),
      totalHT,
      tva,
      totalTTC,
      modeReglement: "—",
    });
  }

  // --- Factures or investissement (acompte + solde) ---
  if (orInvestLignes.length > 0) {
    const rules = await getSettingServer("business_rules");
    const acomptePct = rules?.acompte_pct ?? 10;

    const totalHT = orInvestLignes.reduce((s: number, l: { prix_total: number }) => s + l.prix_total, 0);
    const tva = orInvestLignes.reduce((s: number, l: { montant_taxe: number }) => s + l.montant_taxe, 0);
    const totalTTC = totalHT + tva;
    const montantAcompte = Math.round(totalTTC * (acomptePct / 100) * 100) / 100;
    const montantSolde = totalTTC - montantAcompte;

    // Date limite solde = 48h après
    const dateLimite = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Facture d'acompte
    await generateAndStoreDocument({
      type: "facture_acompte",
      lotId,
      dossierId: dossierData.id,
      clientId: client.id,
      client: clientInfo,
      dossier: dossierInfo,
      references: [],
      totaux: { totalBrut: totalHT, taxe: tva, netAPayer: totalTTC },
      factureVenteLignes: buildFactureLignes(orInvestLignes),
      totalHT,
      tva,
      totalTTC,
      acomptePourcentage: acomptePct,
      montantAcompte,
      montantSolde,
      dateLimiteSolde: formatDate(dateLimite.toISOString()),
    });

    // Facture de solde
    await generateAndStoreDocument({
      type: "facture_solde",
      lotId,
      dossierId: dossierData.id,
      clientId: client.id,
      client: clientInfo,
      dossier: dossierInfo,
      references: [],
      totaux: { totalBrut: totalHT, taxe: tva, netAPayer: totalTTC },
      factureVenteLignes: buildFactureLignes(orInvestLignes),
      totalHT,
      tva,
      totalTTC,
      montantAcompte,
      montantSolde,
      modeReglement: "—",
    });

    // Update lot with acompte info
    await supabase.from("lots").update({
      date_limite_solde: dateLimite.toISOString(),
    }).eq("id", lotId);
  }

  return { success: true };
}
