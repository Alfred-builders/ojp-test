import { z } from "zod";

export const LEAD_SOURCE_OPTIONS = [
  "Bouche à oreille",
  "Google",
  "Réseaux sociaux",
  "Passage en boutique",
  "Recommandation",
  "Publicité",
  "Autre",
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "cni", label: "Carte nationale d'identité" },
  { value: "passeport", label: "Passeport" },
  { value: "titre_sejour", label: "Titre de séjour" },
  { value: "permis_conduire", label: "Permis de conduire" },
] as const;

export const clientSchema = z.object({
  civility: z.enum(["M", "Mme"], { message: "La civilité est requise" }),
  first_name: z.string().min(1, "Le prénom est requis").max(100, "100 caractères maximum"),
  last_name: z.string().min(1, "Le nom est requis").max(100, "100 caractères maximum"),
  maiden_name: z.string().max(100).optional().or(z.literal("")),
  email: z.string().email("Format email invalide").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  postal_code: z.string().max(10).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  lead_source: z.enum(LEAD_SOURCE_OPTIONS).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type ClientFormData = z.infer<typeof clientSchema>;

export const identityDocumentSchema = z.object({
  document_type: z.enum(["cni", "passeport", "titre_sejour", "permis_conduire"], {
    message: "Le type de document est requis",
  }),
  document_number: z.string().min(1, "Le numéro est requis").max(50, "50 caractères maximum"),
  issue_date: z.string().optional().or(z.literal("")),
  expiry_date: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  is_primary: z.boolean().default(true),
});

export type IdentityDocumentFormData = z.infer<typeof identityDocumentSchema>;
