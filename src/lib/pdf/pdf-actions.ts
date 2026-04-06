"use server";

import {
  generateAndStoreDocument,
  generateAndStoreBonLivraison,
} from "./generate-and-store";
import type { GenerateDocumentParams } from "./generate-and-store";
import type { BonLivraisonData } from "./bon-livraison";

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
