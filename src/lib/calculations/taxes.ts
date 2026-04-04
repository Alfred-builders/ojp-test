/**
 * Calcul de la TMP (Taxe sur les Métaux Précieux).
 * Taux fixe de 11.5% sur le montant total de la transaction.
 * Toujours applicable, sans condition.
 */
export function calculerTMP(prixAchat: number): number {
  return Math.round(prixAchat * 0.115 * 100) / 100;
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
  const plusValue = prixAchat - prixAcquisition;
  if (plusValue <= 0) return 0;

  const acquisitionDate = new Date(dateAcquisition);
  const now = new Date();
  const diffMs = now.getTime() - acquisitionDate.getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));

  if (years >= 22) return 0;

  let abatementIR = 0;
  let abatementSocial = 0;

  if (years > 2) {
    abatementIR = Math.min((years - 2) * 5, 100);
    abatementSocial = Math.min((years - 2) * 1.6, 100);
  }

  const tauxIR = 0.19 * (1 - abatementIR / 100);
  const tauxSocial = 0.172 * (1 - abatementSocial / 100);

  return Math.round(plusValue * (tauxIR + tauxSocial) * 100) / 100;
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
