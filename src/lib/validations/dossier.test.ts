import { describe, it, expect } from "vitest";
import { dossierSchema } from "./dossier";

describe("dossierSchema", () => {
  it("valide un dossier minimal", () => {
    const result = dossierSchema.safeParse({
      client_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("valide un dossier avec notes", () => {
    const result = dossierSchema.safeParse({
      client_id: "550e8400-e29b-41d4-a716-446655440000",
      notes: "Client régulier, fidèle depuis 2020",
    });
    expect(result.success).toBe(true);
  });

  it("accepte des notes vides", () => {
    const result = dossierSchema.safeParse({
      client_id: "550e8400-e29b-41d4-a716-446655440000",
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un client_id vide", () => {
    const result = dossierSchema.safeParse({ client_id: "" });
    expect(result.success).toBe(false);
  });

  it("rejette un dossier sans client_id", () => {
    const result = dossierSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejette un dossier sans client_id mais avec notes", () => {
    const result = dossierSchema.safeParse({ notes: "test" });
    expect(result.success).toBe(false);
  });
});
