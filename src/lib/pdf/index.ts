// Type-only exports — safe to import from client components
export type {
  ClientInfo,
  DossierInfo,
  ReferenceLigne,
  TotauxInfo,
  DepotVenteReferenceLigne,
  ConfieReferenceLigne,
  QuittanceDepotVenteLigne,
  FactureVenteLigne,
  BonCommandeLigne,
  BonLivraisonLigneData,
  BonLivraisonGroupData,
  FonderieInfo,
} from "./blocks";

// Runtime PDF functions are server-only — use @/lib/pdf/pdf-actions from client components
