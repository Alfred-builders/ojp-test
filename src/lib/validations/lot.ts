import { z } from "zod";

// ============================================================
// Lot status options
// ============================================================
export const LOT_STATUS_OPTIONS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "accepte", label: "Accepté" },
  { value: "refuse", label: "Refusé" },
  { value: "en_retractation", label: "En rétractation" },
  { value: "finalise", label: "Finalisé" },
  { value: "retracte", label: "Rétracté" },
] as const;

export const LOT_TYPE_OPTIONS = [
  { value: "rachat", label: "Rachat" },
  { value: "vente", label: "Vente" },
  { value: "depot_vente", label: "Dépôt-vente" },
] as const;

export const REFERENCE_CATEGORIE_OPTIONS = [
  { value: "bijoux", label: "Bijoux" },
  { value: "or_investissement", label: "Or Investissement" },
] as const;

export const METAL_OPTIONS = [
  { value: "Or", label: "Or" },
  { value: "Argent", label: "Argent" },
  { value: "Platine", label: "Platine" },
] as const;

export const QUALITE_OPTIONS = [
  { value: "333", label: "333 (8k)" },
  { value: "375", label: "375 (9k)" },
  { value: "585", label: "585 (14k)" },
  { value: "750", label: "750 (18k)" },
  { value: "999", label: "999 (24k)" },
] as const;

export const DESTINATION_OPTIONS = [
  { value: "stock_boutique", label: "Stock boutique" },
  { value: "fonderie", label: "Fonderie" },
  { value: "depot_vente", label: "Dépôt-vente" },
] as const;

// ============================================================
// Bijoux reference form schema
// ============================================================
export const referenceBijouxSchema = z.object({
  designation: z.string().min(1, "La désignation est requise").max(200),
  metal: z.enum(["Or", "Argent", "Platine"], {
    message: "Le métal est requis",
  }),
  qualite: z.enum(["333", "375", "585", "750", "999"], {
    message: "La qualité est requise",
  }),
  poids: z.coerce
    .number({ message: "Le poids est requis" })
    .positive("Le poids doit être positif"),
  quantite: z.coerce.number().int().min(1).default(1),
});

export type ReferenceBijouxFormData = z.infer<typeof referenceBijouxSchema>;

// ============================================================
// Or investissement reference form schema
// ============================================================
export const referenceOrInvestSchema = z.object({
  or_investissement_id: z.string().min(1, "La pièce est requise"),
  designation: z.string().min(1, "La désignation est requise").max(200),
  poids: z.coerce.number().positive("Le poids doit être positif"),
  metal: z.enum(["Or", "Argent", "Platine"]).optional(),
  is_scelle: z.boolean().default(false),
  has_facture: z.boolean().default(false),
  date_acquisition: z.string().optional().or(z.literal("")),
  prix_acquisition: z.coerce.number().min(0).optional(),
  quantite: z.coerce.number().int().min(1).default(1),
});

export type ReferenceOrInvestFormData = z.infer<typeof referenceOrInvestSchema>;
