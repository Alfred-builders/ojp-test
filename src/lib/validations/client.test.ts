import { describe, it, expect } from "vitest";
import { clientSchema, identityDocumentSchema } from "./client";

// ============================================================
// clientSchema
// ============================================================
describe("clientSchema", () => {
  const validClient = {
    civility: "M" as const,
    first_name: "Jean",
    last_name: "Dupont",
  };

  it("valide un client minimal (champs obligatoires)", () => {
    const result = clientSchema.safeParse(validClient);
    expect(result.success).toBe(true);
  });

  it("valide un client complet", () => {
    const result = clientSchema.safeParse({
      ...validClient,
      maiden_name: "Martin",
      email: "jean@example.com",
      phone: "0612345678",
      address: "1 rue de la Paix",
      city: "Paris",
      postal_code: "75001",
      country: "France",
      lead_source: "Google",
      notes: "Client fidèle",
    });
    expect(result.success).toBe(true);
  });

  it("rejette une civilité invalide", () => {
    const result = clientSchema.safeParse({ ...validClient, civility: "Dr" });
    expect(result.success).toBe(false);
  });

  it("rejette un prénom vide", () => {
    const result = clientSchema.safeParse({ ...validClient, first_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejette un nom vide", () => {
    const result = clientSchema.safeParse({ ...validClient, last_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejette un prénom trop long (> 100 chars)", () => {
    const result = clientSchema.safeParse({
      ...validClient,
      first_name: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejette un email invalide", () => {
    const result = clientSchema.safeParse({
      ...validClient,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un email vide (optionnel)", () => {
    const result = clientSchema.safeParse({ ...validClient, email: "" });
    expect(result.success).toBe(true);
  });

  it("accepte un lead_source valide", () => {
    const result = clientSchema.safeParse({
      ...validClient,
      lead_source: "Bouche à oreille",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un lead_source invalide", () => {
    const result = clientSchema.safeParse({
      ...validClient,
      lead_source: "Source inconnue",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un lead_source vide (optionnel)", () => {
    const result = clientSchema.safeParse({
      ...validClient,
      lead_source: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un code postal trop long", () => {
    const result = clientSchema.safeParse({
      ...validClient,
      postal_code: "12345678901",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// identityDocumentSchema
// ============================================================
describe("identityDocumentSchema", () => {
  const validDoc = {
    document_type: "cni" as const,
    document_number: "1234567890",
  };

  it("valide un document minimal", () => {
    const result = identityDocumentSchema.safeParse(validDoc);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_primary).toBe(true); // default
    }
  });

  it("valide un document complet", () => {
    const result = identityDocumentSchema.safeParse({
      ...validDoc,
      issue_date: "2020-01-15",
      expiry_date: "2030-01-15",
      nationality: "Française",
      is_primary: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepte tous les types de documents", () => {
    for (const type of ["cni", "passeport", "titre_sejour", "permis_conduire"]) {
      const result = identityDocumentSchema.safeParse({
        ...validDoc,
        document_type: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejette un type de document invalide", () => {
    const result = identityDocumentSchema.safeParse({
      ...validDoc,
      document_type: "carte_vitale",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un numéro de document vide", () => {
    const result = identityDocumentSchema.safeParse({
      ...validDoc,
      document_number: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un numéro de document trop long (> 50 chars)", () => {
    const result = identityDocumentSchema.safeParse({
      ...validDoc,
      document_number: "X".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});
