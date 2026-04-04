export { generateQuittanceRachat } from "./quittance-rachat";
export { generateContratRachat } from "./contrat-rachat";
export { generateDevisRachat } from "./devis-rachat";
export type {
  ClientInfo,
  DossierInfo,
  ReferenceLigne,
  TotauxInfo,
} from "./blocks";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
