import { z } from "zod";

export const DOSSIER_STATUS_OPTIONS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "en_cours", label: "En cours" },
  { value: "finalise", label: "Finalisé" },
] as const;

export const dossierSchema = z.object({
  client_id: z.string().min(1, "Le client est requis"),
  notes: z.string().optional().or(z.literal("")),
});

export type DossierFormData = z.infer<typeof dossierSchema>;
