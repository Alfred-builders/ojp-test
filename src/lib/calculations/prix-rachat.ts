/** Returns 0 for NaN, Infinity, or negative numbers. */
function safeNum(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Calcul du prix de rachat pour les bijoux.
 *
 * Formule : cours_metal × (qualite / 1000) × poids × coefficient_rachat
 *
 * @param coursMetalGramme - Prix du gramme du métal pur (snapshot)
 * @param qualite - Pureté en millièmes (ex: 750 pour 18k)
 * @param poids - Poids en grammes
 * @param coefficientRachat - Coefficient de marge (ex: 0.85)
 */
export function calculerPrixRachatBijoux(
  coursMetalGramme: number,
  qualite: number,
  poids: number,
  coefficientRachat: number
): number {
  return Math.round(safeNum(coursMetalGramme) * (safeNum(qualite) / 1000) * safeNum(poids) * safeNum(coefficientRachat) * 100) / 100;
}

/**
 * Calcul du prix de rachat pour l'or investissement.
 *
 * Formule : cours_metal × poids × coefficient
 *
 * @param coursMetalGramme - Prix du gramme du métal pur (snapshot)
 * @param poids - Poids en grammes (du catalogue)
 * @param coefficient - Coefficient d'achat (global ou spécifique)
 */
export function calculerPrixRachatOrInvest(
  coursMetalGramme: number,
  poids: number,
  coefficient: number
): number {
  return Math.round(safeNum(coursMetalGramme) * safeNum(poids) * safeNum(coefficient) * 100) / 100;
}

/**
 * Retourne le cours du métal approprié depuis les snapshots du lot.
 */
export function getCoursMetalFromSnapshot(
  metal: "Or" | "Argent" | "Platine",
  coursOrSnapshot: number,
  coursArgentSnapshot: number,
  coursPlatineSnapshot: number
): number {
  switch (metal) {
    case "Or":
      return coursOrSnapshot;
    case "Argent":
      return coursArgentSnapshot;
    case "Platine":
      return coursPlatineSnapshot;
  }
}
