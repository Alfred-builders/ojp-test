import { describe, it, expect } from "vitest";
import {
  calculerPrixRachatBijoux,
  calculerPrixRachatOrInvest,
  getCoursMetalFromSnapshot,
} from "./prix-rachat";

// ============================================================
// calculerPrixRachatBijoux
// ============================================================
describe("calculerPrixRachatBijoux", () => {
  it("calcule correctement pour de l'or 18k", () => {
    // cours=65, qualite=750, poids=10g, coeff=0.85
    // 65 * (750/1000) * 10 * 0.85 = 65 * 0.75 * 10 * 0.85 = 414.375
    expect(calculerPrixRachatBijoux(65, 750, 10, 0.85)).toBe(414.38);
  });

  it("calcule correctement pour de l'or 24k", () => {
    // cours=65, qualite=999, poids=5g, coeff=0.90
    // 65 * (999/1000) * 5 * 0.90 = 65 * 0.999 * 5 * 0.90 = 292.2075
    expect(calculerPrixRachatBijoux(65, 999, 5, 0.9)).toBe(292.21);
  });

  it("retourne 0 si le poids est 0", () => {
    expect(calculerPrixRachatBijoux(65, 750, 0, 0.85)).toBe(0);
  });

  it("retourne 0 pour NaN dans n'importe quel paramètre", () => {
    expect(calculerPrixRachatBijoux(NaN, 750, 10, 0.85)).toBe(0);
    expect(calculerPrixRachatBijoux(65, NaN, 10, 0.85)).toBe(0);
    expect(calculerPrixRachatBijoux(65, 750, NaN, 0.85)).toBe(0);
    expect(calculerPrixRachatBijoux(65, 750, 10, NaN)).toBe(0);
  });

  it("retourne 0 pour Infinity", () => {
    expect(calculerPrixRachatBijoux(Infinity, 750, 10, 0.85)).toBe(0);
  });

  it("retourne 0 pour des valeurs négatives", () => {
    expect(calculerPrixRachatBijoux(-65, 750, 10, 0.85)).toBe(0);
    expect(calculerPrixRachatBijoux(65, -750, 10, 0.85)).toBe(0);
    expect(calculerPrixRachatBijoux(65, 750, -10, 0.85)).toBe(0);
    expect(calculerPrixRachatBijoux(65, 750, 10, -0.85)).toBe(0);
  });
});

// ============================================================
// calculerPrixRachatOrInvest
// ============================================================
describe("calculerPrixRachatOrInvest", () => {
  it("calcule correctement pour un lingot", () => {
    // cours=65, poids=100g, coeff=0.95
    // 65 * 100 * 0.95 = 6175
    expect(calculerPrixRachatOrInvest(65, 100, 0.95)).toBe(6175);
  });

  it("calcule correctement pour une pièce", () => {
    // cours=65, poids=6.45g (Napoléon), coeff=0.92
    // 65 * 6.45 * 0.92 = 385.71
    expect(calculerPrixRachatOrInvest(65, 6.45, 0.92)).toBe(385.71);
  });

  it("arrondit à 2 décimales", () => {
    // 65 * 3.11 * 0.88 = 177.8872 → 177.89
    expect(calculerPrixRachatOrInvest(65, 3.11, 0.88)).toBe(177.89);
  });

  it("retourne 0 pour NaN", () => {
    expect(calculerPrixRachatOrInvest(NaN, 100, 0.95)).toBe(0);
    expect(calculerPrixRachatOrInvest(65, NaN, 0.95)).toBe(0);
    expect(calculerPrixRachatOrInvest(65, 100, NaN)).toBe(0);
  });

  it("retourne 0 pour Infinity", () => {
    expect(calculerPrixRachatOrInvest(Infinity, 100, 0.95)).toBe(0);
  });

  it("retourne 0 pour des valeurs négatives", () => {
    expect(calculerPrixRachatOrInvest(-65, 100, 0.95)).toBe(0);
    expect(calculerPrixRachatOrInvest(65, -100, 0.95)).toBe(0);
    expect(calculerPrixRachatOrInvest(65, 100, -0.95)).toBe(0);
  });

  it("retourne 0 si cours est 0", () => {
    expect(calculerPrixRachatOrInvest(0, 100, 0.95)).toBe(0);
  });
});

// ============================================================
// getCoursMetalFromSnapshot
// ============================================================
describe("getCoursMetalFromSnapshot", () => {
  it("retourne le cours de l'or", () => {
    expect(getCoursMetalFromSnapshot("Or", 65, 0.8, 30)).toBe(65);
  });

  it("retourne le cours de l'argent", () => {
    expect(getCoursMetalFromSnapshot("Argent", 65, 0.8, 30)).toBe(0.8);
  });

  it("retourne le cours du platine", () => {
    expect(getCoursMetalFromSnapshot("Platine", 65, 0.8, 30)).toBe(30);
  });
});
