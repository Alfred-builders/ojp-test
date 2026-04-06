import { describe, it, expect } from "vitest";
import { referenceBijouxSchema, referenceOrInvestSchema } from "./lot";

// ============================================================
// referenceBijouxSchema
// ============================================================
describe("referenceBijouxSchema", () => {
  const valid = {
    designation: "Bague or 18k",
    metal: "Or" as const,
    qualite: "750" as const,
    poids: 5.2,
  };

  it("valide une référence bijoux minimale", () => {
    const result = referenceBijouxSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantite).toBe(1); // default
    }
  });

  it("valide avec une quantité explicite", () => {
    const result = referenceBijouxSchema.safeParse({ ...valid, quantite: 3 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantite).toBe(3);
    }
  });

  it("rejette une désignation vide", () => {
    expect(
      referenceBijouxSchema.safeParse({ ...valid, designation: "" }).success
    ).toBe(false);
  });

  it("rejette une désignation trop longue (> 200)", () => {
    expect(
      referenceBijouxSchema.safeParse({
        ...valid,
        designation: "A".repeat(201),
      }).success
    ).toBe(false);
  });

  it("rejette un métal invalide", () => {
    expect(
      referenceBijouxSchema.safeParse({ ...valid, metal: "Cuivre" }).success
    ).toBe(false);
  });

  it("accepte tous les métaux valides", () => {
    for (const metal of ["Or", "Argent", "Platine"]) {
      expect(
        referenceBijouxSchema.safeParse({ ...valid, metal }).success
      ).toBe(true);
    }
  });

  it("rejette une qualité invalide", () => {
    expect(
      referenceBijouxSchema.safeParse({ ...valid, qualite: "500" }).success
    ).toBe(false);
  });

  it("accepte toutes les qualités valides", () => {
    for (const qualite of ["333", "375", "585", "750", "999"]) {
      expect(
        referenceBijouxSchema.safeParse({ ...valid, qualite }).success
      ).toBe(true);
    }
  });

  it("rejette un poids négatif", () => {
    expect(
      referenceBijouxSchema.safeParse({ ...valid, poids: -1 }).success
    ).toBe(false);
  });

  it("rejette un poids de 0", () => {
    expect(
      referenceBijouxSchema.safeParse({ ...valid, poids: 0 }).success
    ).toBe(false);
  });

  it("coerce les strings en nombres pour le poids", () => {
    const result = referenceBijouxSchema.safeParse({
      ...valid,
      poids: "5.2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.poids).toBe(5.2);
    }
  });

  it("rejette une quantité de 0", () => {
    expect(
      referenceBijouxSchema.safeParse({ ...valid, quantite: 0 }).success
    ).toBe(false);
  });

  it("rejette une quantité décimale", () => {
    expect(
      referenceBijouxSchema.safeParse({ ...valid, quantite: 1.5 }).success
    ).toBe(false);
  });
});

// ============================================================
// referenceOrInvestSchema
// ============================================================
describe("referenceOrInvestSchema", () => {
  const valid = {
    or_investissement_id: "550e8400-e29b-41d4-a716-446655440000",
    designation: "Napoléon 20F",
    poids: 6.45,
  };

  it("valide une référence or investissement minimale", () => {
    const result = referenceOrInvestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_scelle).toBe(false);
      expect(result.data.has_facture).toBe(false);
      expect(result.data.quantite).toBe(1);
    }
  });

  it("valide avec toutes les options TPV", () => {
    const result = referenceOrInvestSchema.safeParse({
      ...valid,
      metal: "Or",
      is_scelle: true,
      has_facture: true,
      date_acquisition: "2015-06-20",
      prix_acquisition: 250,
      quantite: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejette un or_investissement_id vide", () => {
    expect(
      referenceOrInvestSchema.safeParse({ ...valid, or_investissement_id: "" })
        .success
    ).toBe(false);
  });

  it("rejette une désignation vide", () => {
    expect(
      referenceOrInvestSchema.safeParse({ ...valid, designation: "" }).success
    ).toBe(false);
  });

  it("rejette un poids négatif", () => {
    expect(
      referenceOrInvestSchema.safeParse({ ...valid, poids: -1 }).success
    ).toBe(false);
  });

  it("accepte un prix_acquisition de 0", () => {
    const result = referenceOrInvestSchema.safeParse({
      ...valid,
      prix_acquisition: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejette un prix_acquisition négatif", () => {
    expect(
      referenceOrInvestSchema.safeParse({
        ...valid,
        prix_acquisition: -100,
      }).success
    ).toBe(false);
  });

  it("accepte date_acquisition vide (optionnel)", () => {
    const result = referenceOrInvestSchema.safeParse({
      ...valid,
      date_acquisition: "",
    });
    expect(result.success).toBe(true);
  });
});
