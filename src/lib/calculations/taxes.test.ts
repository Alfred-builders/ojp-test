import { describe, it, expect, vi } from "vitest";
import {
  calculerTMP,
  calculerTFOP,
  calculerTVAMarge,
  isTPVEligible,
  calculerTPV,
  regimeFiscalOptimal,
  regimeFiscalOptimalBijoux,
} from "./taxes";

// ============================================================
// calculerTMP
// ============================================================
describe("calculerTMP", () => {
  it("calcule 11.5% sur un montant standard", () => {
    expect(calculerTMP(1000)).toBe(115);
    expect(calculerTMP(5000)).toBe(575);
  });

  it("arrondit à 2 décimales", () => {
    // 123.45 * 0.115 = 14.19675 → 14.2
    expect(calculerTMP(123.45)).toBe(14.2);
  });

  it("retourne 0 pour un montant de 0", () => {
    expect(calculerTMP(0)).toBe(0);
  });

  it("retourne 0 pour NaN", () => {
    expect(calculerTMP(NaN)).toBe(0);
  });

  it("retourne 0 pour Infinity", () => {
    expect(calculerTMP(Infinity)).toBe(0);
  });

  it("retourne 0 pour un montant négatif", () => {
    expect(calculerTMP(-500)).toBe(0);
  });
});

// ============================================================
// calculerTFOP
// ============================================================
describe("calculerTFOP", () => {
  it("retourne 0 pour un montant ≤ 5000 €", () => {
    expect(calculerTFOP(5000)).toBe(0);
    expect(calculerTFOP(4999.99)).toBe(0);
    expect(calculerTFOP(1000)).toBe(0);
    expect(calculerTFOP(0)).toBe(0);
  });

  it("calcule 6.5% au-dessus de 5000 €", () => {
    // 7000 * 0.065 = 455
    expect(calculerTFOP(7000)).toBe(455);
    // 10000 * 0.065 = 650
    expect(calculerTFOP(10000)).toBe(650);
  });

  it("arrondit à 2 décimales", () => {
    // 5001 * 0.065 = 325.065 → 325.07
    expect(calculerTFOP(5001)).toBe(325.07);
  });

  it("retourne 0 pour NaN, Infinity, négatif", () => {
    expect(calculerTFOP(NaN)).toBe(0);
    expect(calculerTFOP(Infinity)).toBe(0);
    expect(calculerTFOP(-500)).toBe(0);
  });
});

// ============================================================
// calculerTVAMarge
// ============================================================
describe("calculerTVAMarge", () => {
  it("calcule 20% sur la marge positive", () => {
    // marge = 9000 - 7000 = 2000, TVA = 400
    expect(calculerTVAMarge(9000, 7000)).toBe(400);
  });

  it("retourne 0 si pas de marge", () => {
    expect(calculerTVAMarge(7000, 7000)).toBe(0);
    expect(calculerTVAMarge(5000, 7000)).toBe(0);
  });

  it("arrondit à 2 décimales", () => {
    // marge = 100.50, TVA = 20.10
    expect(calculerTVAMarge(7100.50, 7000)).toBe(20.1);
  });

  it("retourne 0 quand prixVente est NaN, Infinity ou négatif", () => {
    expect(calculerTVAMarge(NaN, 7000)).toBe(0);
    expect(calculerTVAMarge(Infinity, 7000)).toBe(0);
    expect(calculerTVAMarge(-1000, 7000)).toBe(0);
  });

  it("traite prixAchat NaN/négatif comme 0 (marge = prixVente entier)", () => {
    // safeNum(NaN) = 0, donc marge = 9000 - 0 = 9000, TVA = 1800
    expect(calculerTVAMarge(9000, NaN)).toBe(1800);
    expect(calculerTVAMarge(9000, -1000)).toBe(1800);
  });
});

// ============================================================
// isTPVEligible
// ============================================================
describe("isTPVEligible", () => {
  it("retourne true quand toutes les conditions sont réunies", () => {
    expect(isTPVEligible(true, true, "2020-01-01", 5000)).toBe(true);
  });

  it("retourne false sans facture", () => {
    expect(isTPVEligible(false, true, "2020-01-01", 5000)).toBe(false);
  });

  it("retourne false sans scellé", () => {
    expect(isTPVEligible(true, false, "2020-01-01", 5000)).toBe(false);
  });

  it("retourne false sans date d'acquisition", () => {
    expect(isTPVEligible(true, true, null, 5000)).toBe(false);
    expect(isTPVEligible(true, true, "", 5000)).toBe(false);
  });

  it("retourne false sans prix d'acquisition", () => {
    expect(isTPVEligible(true, true, "2020-01-01", null)).toBe(false);
    expect(isTPVEligible(true, true, "2020-01-01", 0)).toBe(false);
    expect(isTPVEligible(true, true, "2020-01-01", -100)).toBe(false);
  });
});

// ============================================================
// calculerTPV
// ============================================================
describe("calculerTPV", () => {
  it("retourne 0 quand il n'y a pas de plus-value", () => {
    expect(calculerTPV(1000, 1500, "2023-01-01")).toBe(0);
    expect(calculerTPV(1000, 1000, "2023-01-01")).toBe(0);
  });

  it("exonération totale après 22 ans de détention", () => {
    expect(calculerTPV(10000, 5000, "2000-01-01")).toBe(0);
  });

  it("calcule correctement sans abattement (< 3 ans)", () => {
    // Plus-value: 10000 - 5000 = 5000
    // IR: 5000 * 0.19 = 950
    // Social: 5000 * 0.172 = 860
    // Total: 1810
    const recentDate = new Date();
    recentDate.setFullYear(recentDate.getFullYear() - 1);
    const result = calculerTPV(10000, 5000, recentDate.toISOString());
    expect(result).toBe(1810);
  });

  it("applique l'abattement IR et social après la 2e année", () => {
    // 5 ans de détention → 3 ans d'abattement
    // abatementIR = 3 * 5 = 15%
    // abatementSocial = 3 * 1.6 = 4.8%
    // Plus-value: 5000
    // IR: 5000 * 0.19 * (1 - 0.15) = 5000 * 0.1615 = 807.5
    // Social: 5000 * 0.172 * (1 - 0.048) = 5000 * 0.163744 = 818.72
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    fiveYearsAgo.setMonth(0, 1); // Jan 1 to avoid boundary issues
    const result = calculerTPV(10000, 5000, fiveYearsAgo.toISOString());
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1810); // Should be less than without abattement
  });

  it("retourne 0 quand prixAchat est NaN", () => {
    // safeNum(NaN) = 0, so plusValue = 0 - safeNum(5000) = -5000 → 0
    expect(calculerTPV(NaN, 5000, "2023-01-01")).toBe(0);
  });

  it("traite prixAcquisition NaN comme 0 (full plus-value)", () => {
    // safeNum(NaN) = 0, so plusValue = 10000 - 0 = 10000
    // This is the correct safe behavior — NaN acquisition = unknown = 0
    const result = calculerTPV(10000, NaN, "2023-01-01");
    expect(result).toBeGreaterThan(0);
  });

  it("retourne 0 pour une date invalide", () => {
    expect(calculerTPV(10000, 5000, "not-a-date")).toBe(0);
    expect(calculerTPV(10000, 5000, "")).toBe(0);
  });

  it("retourne 0 pour Infinity", () => {
    expect(calculerTPV(Infinity, 5000, "2023-01-01")).toBe(0);
  });

  it("retourne 0 pour des montants négatifs", () => {
    // safeNum(-1000) returns 0, so plusValue = 0 - safeNum(5000) = -5000
    expect(calculerTPV(-1000, 5000, "2023-01-01")).toBe(0);
  });
});

// ============================================================
// regimeFiscalOptimal
// ============================================================
describe("regimeFiscalOptimal", () => {
  it("choisit TPV quand c'est moins cher que TMP", () => {
    const result = regimeFiscalOptimal(100, 200);
    expect(result).toEqual({ regime: "TPV", montant: 100 });
  });

  it("choisit TMP quand c'est moins cher ou égal", () => {
    expect(regimeFiscalOptimal(200, 100)).toEqual({ regime: "TMP", montant: 100 });
    expect(regimeFiscalOptimal(100, 100)).toEqual({ regime: "TMP", montant: 100 });
  });

  it("choisit TMP quand TPV est null", () => {
    expect(regimeFiscalOptimal(null, 150)).toEqual({ regime: "TMP", montant: 150 });
  });
});

// ============================================================
// regimeFiscalOptimalBijoux
// ============================================================
describe("regimeFiscalOptimalBijoux", () => {
  it("choisit TPV quand c'est moins cher que TFOP", () => {
    expect(regimeFiscalOptimalBijoux(100, 200)).toEqual({ regime: "TPV", montant: 100 });
  });

  it("choisit TFOP quand c'est moins cher ou égal", () => {
    expect(regimeFiscalOptimalBijoux(200, 100)).toEqual({ regime: "TFOP", montant: 100 });
    expect(regimeFiscalOptimalBijoux(100, 100)).toEqual({ regime: "TFOP", montant: 100 });
  });

  it("choisit TFOP quand TPV est null", () => {
    expect(regimeFiscalOptimalBijoux(null, 150)).toEqual({ regime: "TFOP", montant: 150 });
  });

  it("retourne TFOP = 0 si sous le seuil 5000 €", () => {
    // Si TFOP = 0 (sous seuil), et TPV est null → montant = 0
    expect(regimeFiscalOptimalBijoux(null, 0)).toEqual({ regime: "TFOP", montant: 0 });
  });
});
