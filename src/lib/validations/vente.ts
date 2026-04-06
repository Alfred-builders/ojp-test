export const VENTE_STATUS_OPTIONS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" },
] as const;

export const MODE_REGLEMENT_OPTIONS = [
  { value: "especes", label: "Espèces" },
  { value: "carte", label: "Carte bancaire" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
] as const;
