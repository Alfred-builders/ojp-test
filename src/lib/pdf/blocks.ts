// ============================================================
// PDF Design System — shared types and constants
// ============================================================

// Colors
export const GOLD = "#C8A84E";
export const DARK = "#2D2D2D";
export const GRAY = "#6B7280";
export const LIGHT_GRAY = "#E5E7EB";
export const WHITE = "#FFFFFF";

// Company info
export const SOCIETE = {
  nom: "L'Or au Juste Prix",
  adresse: "4 Grande Rue 74160 St Julien en Genevois",
  telephone: "06 78 87 75 78",
  details: "SAS au capital de 5000.00€",
};

// Types
export interface DocumentInfo {
  title: string;
  numero: string;
}

export interface ClientInfo {
  civilite: string;
  nom: string;
  prenom: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  documentType?: string;
  documentNumber?: string;
}

export interface DossierInfo {
  numeroDossier: string;
  numeroLot: string;
  date: string;
  heure: string;
  reglement?: string;
}

export interface ReferenceLigne {
  designation: string;
  metal: string;
  titrage: string;
  poids: number;
  quantite: number;
  taxe: string;
  prixUnitaire: number;
  prixTotal: number;
}

export interface TotauxInfo {
  totalBrut: number;
  taxe: number;
  netAPayer: number;
}

// Helpers
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  })
    .format(amount)
    // Replace narrow no-break space (U+202F) and non-breaking space (U+00A0) with regular space
    // so the PDF renderer displays them correctly
    .replace(/[\u202F\u00A0]/g, " ");
}

// Legal texts
export const TEXTE_CONDITIONS_ACHAT =
  "Le vendeur déclare avoir atteint la majorité légale, être le propriétaire légitime des biens, agir à titre privé et que ces biens ne proviennent d'aucune activité illicite. La taxe sur les métaux précieux (11,5%) est acquittée par nos soins.";

export const TEXTE_CONDITIONS_CONTRAT =
  `Si vous souhaitez exercer votre droit de rétractation dans les 48 heures à compter de la signature du contrat vous pouvez utiliser le formulaire détachable prévu à cet effet ou toute autre déclaration dénuée d'ambigüité exprimant votre volonté de vous rétracter conformément à l'article R224-4.

Conformément à l'article R.224-7, pour exercer son droit de rétractation prévu par l'article L.224-99, le consommateur-vendeur, sans avoir à justifier de motifs, remet au professionnel en main propre le formulaire détachable ou toute autre déclaration dénuée d'ambiguïté exprimant sa volonté de se rétracter, au plus tard 48H à compter du jour et de l'heure de la signature du contrat, ou toute autre moyen permettant d'attester de la date et l'heure d'envoi au plus tard 48h à compter du jour et de l'heure de la signature du contrat. Si le délai expire un samedi, un dimanche, un jour chômé ou un jour férié, il est prorogé jusqu'au premier jour ouvrable suivant à la même heure. L'envoi ou la remise du formulaire au professionnel et dans le délai imparti a pour effet d'annuler l'opération d'achat. A défaut le contrat est conclu définitivement.

Rappel : Conformément au 2eme alinéa de l'article L.224-9, l'exercice du droit de rétractation met fin aux obligations des parties. Le consommateur doit alors rembourser au professionnel le prix perçu, et, en contrepartie, ce dernier doit lui restituer le ou les objets achetés. A défaut de restituer le ou les objets achetés, le professionnel verse au consommateur une somme équivalente au double prix de vente perçu pour le bien ou les objets achetés. Conformément au troisième alinéa du même article, le consommateur-vendeur ne dispose pas d'un droit de rétractation pour les opérations d'or d'investissement.`;

export const TEXTE_DEVIS_VALIDITE =
  "Ce devis est valable 48 heures à compter de sa date d'émission. Passé ce délai, les prix pourront être révisés en fonction du cours des métaux précieux. Les prix indiqués sont basés sur les cours en vigueur au moment de l'établissement du devis.";
