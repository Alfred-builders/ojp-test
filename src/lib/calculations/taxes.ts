/** Returns 0 for NaN, Infinity, or negative numbers. */
function safeNum(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Calcul de la TMP (Taxe sur les Métaux Précieux).
 * Taux fixe de 11.5% sur le montant total de la transaction.
 * Toujours applicable, sans condition.
 */
export function calculerTMP(prixAchat: number): number {
  return Math.round(safeNum(prixAchat) * 0.115 * 100) / 100;
}

/**
 * Vérifie l'éligibilité à la TPV (Taxe sur la Plus-Value).
 * Conditions requises : facture au nom du client + scellés intacts + date d'acquisition + prix d'acquisition.
 */
export function isTPVEligible(
  hasFacture: boolean,
  isScelle: boolean,
  dateAcquisition: string | null,
  prixAcquisition: number | null
): boolean {
  return (
    hasFacture &&
    isScelle &&
    dateAcquisition !== null &&
    dateAcquisition !== "" &&
    prixAcquisition !== null &&
    prixAcquisition > 0
  );
}

/**
 * Calcul de la TPV (Taxe sur la Plus-Value).
 *
 * - Base : plus-value = prix_achat - prix_acquisition
 * - Si plus-value <= 0 : pas de taxe
 * - Si détention >= 22 ans : exonération totale
 * - Sinon : taux dégressif avec abattement à partir de la 3e année
 *   - IR : 19% avec abattement de 5%/an après la 2e année
 *   - Prélèvements sociaux : 17.2% avec abattement de 1.6%/an après la 2e année
 *
 * @param prixAchat - Prix de rachat proposé
 * @param prixAcquisition - Prix d'acquisition original
 * @param dateAcquisition - Date d'acquisition (ISO string)
 */
export function calculerTPV(
  prixAchat: number,
  prixAcquisition: number,
  dateAcquisition: string
): number {
  const plusValue = safeNum(prixAchat) - safeNum(prixAcquisition);
  if (plusValue <= 0) return 0;

  const acq = new Date(dateAcquisition);
  if (isNaN(acq.getTime())) return 0;
  const now = new Date();
  let years = now.getFullYear() - acq.getFullYear();
  if (
    now.getMonth() < acq.getMonth() ||
    (now.getMonth() === acq.getMonth() && now.getDate() < acq.getDate())
  ) {
    years--;
  }

  if (years >= 22) return 0;

  let abatementIR = 0;
  let abatementSocial = 0;

  if (years > 2) {
    abatementIR = Math.min((years - 2) * 5, 100);
    abatementSocial = Math.min((years - 2) * 1.6, 100);
  }

  const tauxIR = 0.19 * (1 - abatementIR / 100);
  const tauxSocial = 0.172 * (1 - abatementSocial / 100);

  const montantIR = Math.round(plusValue * tauxIR * 100) / 100;
  const montantSocial = Math.round(plusValue * tauxSocial * 100) / 100;
  return montantIR + montantSocial;
}

/**
 * Calcul de la TFOP (Taxe Forfaitaire sur les Objets Précieux).
 * Taux fixe de 6% + 0.5% CRDS = 6.5% sur le montant total de la cession.
 * Exonéré si le montant de cession est ≤ 5 000 €.
 */
export function calculerTFOP(prixCession: number): number {
  const prix = safeNum(prixCession);
  if (prix <= 5000) return 0;
  return Math.round(prix * 0.065 * 100) / 100;
}

/**
 * Calcul de la TVA sur la marge (régime des biens d'occasion, art. 297 A CGI).
 * Taux de 20% appliqué sur la marge (prix de vente - prix d'achat).
 * Si la marge est négative ou nulle, pas de TVA.
 */
export function calculerTVAMarge(prixVente: number, prixAchat: number): number {
  const marge = safeNum(prixVente) - safeNum(prixAchat);
  if (marge <= 0) return 0;
  return Math.round(marge * 0.2 * 100) / 100;
}

/**
 * Compare TPV et TMP et retourne le régime le plus avantageux (le moins cher).
 */
export function regimeFiscalOptimal(
  tpvMontant: number | null,
  tmpMontant: number
): { regime: "TPV" | "TMP"; montant: number } {
  if (tpvMontant !== null && tpvMontant < tmpMontant) {
    return { regime: "TPV", montant: tpvMontant };
  }
  return { regime: "TMP", montant: tmpMontant };
}

/**
 * Compare TPV et TFOP et retourne le régime le plus avantageux (le moins cher).
 * Utilisé pour les bijoux (TFOP au lieu de TMP).
 */
export function regimeFiscalOptimalBijoux(
  tpvMontant: number | null,
  tfopMontant: number
): { regime: "TPV" | "TFOP"; montant: number } {
  if (tpvMontant !== null && tpvMontant < tfopMontant) {
    return { regime: "TPV", montant: tpvMontant };
  }
  return { regime: "TFOP", montant: tfopMontant };
}
