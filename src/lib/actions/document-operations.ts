import { generateDocument } from "@/lib/pdf/pdf-actions";
import { formatDate, formatTime } from "@/lib/format";
import type { ClientInfo, DossierInfo, ReferenceLigne, TotauxInfo } from "@/lib/pdf";
import type { LotReference } from "@/types/lot";
import type { ActionContext } from "./action-types";

function buildClientInfo(ctx: ActionContext): ClientInfo {
  return {
    civilite: ctx.dossier.client.civility === "M" ? "M." : "Mme",
    nom: ctx.dossier.client.last_name,
    prenom: ctx.dossier.client.first_name,
    adresse: ctx.dossier.client.address ?? undefined,
    codePostal: ctx.dossier.client.postal_code ?? undefined,
    ville: ctx.dossier.client.city ?? undefined,
  };
}

function buildDossierInfo(ctx: ActionContext, now: Date): DossierInfo {
  return {
    numeroDossier: ctx.dossier.numero,
    numeroLot: ctx.lot.numero,
    date: formatDate(now.toISOString()),
    heure: formatTime(now),
  };
}

function buildRefLignes(refs: LotReference[]): ReferenceLigne[] {
  return refs.map((r) => ({
    designation: r.designation,
    metal: r.metal ?? "—",
    titrage: r.qualite ?? "—",
    poids: r.poids_net ?? r.poids ?? 0,
    quantite: r.quantite,
    taxe: r.montant_taxe > 0 ? (r.regime_fiscal === "TFOP" ? "6.5%" : r.regime_fiscal === "TPV" ? "TPV" : "11.5%") : "0%",
    prixUnitaire: r.prix_achat,
    prixTotal: r.prix_achat * r.quantite,
  }));
}

function getTaxeLabel(refs: LotReference[]): string {
  const regime = refs.find((r) => r.regime_fiscal)?.regime_fiscal;
  if (regime === "TFOP") return "Taxe (TFOP+CRDS)";
  if (regime === "TPV") return "Taxe (Plus-Value)";
  return "Taxe (TMP+CRDS)";
}

function buildTotaux(refs: LotReference[]): TotauxInfo {
  const brut = refs.reduce((s, r) => s + r.prix_achat * r.quantite, 0);
  const taxe = refs.reduce((s, r) => s + r.montant_taxe * r.quantite, 0);
  return { totalBrut: brut, taxe, netAPayer: brut - taxe, taxeLabel: getTaxeLabel(refs) };
}

/**
 * Generate a quittance de rachat for given bijoux references.
 */
export async function generateQuittanceRachat(
  ctx: ActionContext,
  bijouxRefs: LotReference[]
): Promise<string | null> {
  if (bijouxRefs.length === 0) return null;
  const now = new Date();
  console.log("[DOC-GEN] generateQuittanceRachat called for lot:", ctx.lot.id, "refs:", bijouxRefs.length);
  try {
    const result = await generateDocument({
      type: "quittance_rachat",
      lotId: ctx.lot.id,
      dossierId: ctx.dossier.id,
      clientId: ctx.dossier.client.id,
      client: buildClientInfo(ctx),
      dossier: buildDossierInfo(ctx, now),
      references: buildRefLignes(bijouxRefs),
      totaux: buildTotaux(bijouxRefs),
    });
    console.log("[DOC-GEN] generateQuittanceRachat result:", result);
    return result;
  } catch (err) {
    console.error("[DOC-GEN] generateQuittanceRachat error:", err);
    return null;
  }
}

/**
 * Generate a quittance for a single reference (used in per-ref validation).
 */
export async function generateQuittanceSingleRef(
  ctx: ActionContext,
  ref: LotReference
): Promise<string | null> {
  const now = new Date();
  return generateDocument({
    type: "quittance_rachat",
    lotId: ctx.lot.id,
    dossierId: ctx.dossier.id,
    clientId: ctx.dossier.client.id,
    client: buildClientInfo(ctx),
    dossier: buildDossierInfo(ctx, now),
    references: buildRefLignes([ref]),
    totaux: {
      totalBrut: ref.prix_achat * ref.quantite,
      taxe: ref.montant_taxe * ref.quantite,
      netAPayer: (ref.prix_achat - ref.montant_taxe) * ref.quantite,
      taxeLabel: getTaxeLabel([ref]),
    },
  });
}

/**
 * Generate a contrat de rachat for bijoux references.
 */
export async function generateContratRachat(
  ctx: ActionContext,
  bijouxRefs: LotReference[]
): Promise<string | null> {
  if (bijouxRefs.length === 0) return null;
  const now = new Date();
  try {
    return await generateDocument({
      type: "contrat_rachat",
      lotId: ctx.lot.id,
      dossierId: ctx.dossier.id,
      clientId: ctx.dossier.client.id,
      client: buildClientInfo(ctx),
      dossier: buildDossierInfo(ctx, now),
      references: buildRefLignes(bijouxRefs),
      totaux: buildTotaux(bijouxRefs),
      lotReferenceIds: bijouxRefs.map((r) => r.id),
    });
  } catch (err) {
    console.error("[DOC-GEN] generateContratRachat error:", err);
    return null;
  }
}

/**
 * Generate a quittance de rachat for or investissement references.
 */
export async function generateQuittanceOrInvest(
  ctx: ActionContext,
  orInvestRefs: LotReference[]
): Promise<string | null> {
  if (orInvestRefs.length === 0) return null;
  const now = new Date();
  try {
    return await generateDocument({
      type: "quittance_rachat",
      lotId: ctx.lot.id,
      dossierId: ctx.dossier.id,
      clientId: ctx.dossier.client.id,
      client: buildClientInfo(ctx),
      dossier: buildDossierInfo(ctx, now),
      references: buildRefLignes(orInvestRefs),
      totaux: buildTotaux(orInvestRefs),
      lotReferenceIds: orInvestRefs.map((r) => r.id),
    });
  } catch (err) {
    console.error("[DOC-GEN] generateQuittanceOrInvest error:", err);
    return null;
  }
}
