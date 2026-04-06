// ============================================================
// PDF Design System — shared types and constants
// ============================================================

// Colors
export const GOLD = "#C8A84E";
export const DARK = "#2D2D2D";
export const GRAY = "#6B7280";
export const LIGHT_GRAY = "#E5E7EB";
export const WHITE = "#FFFFFF";

// Company info — mutable, refreshed from settings before PDF generation
export const SOCIETE = {
  nom: "L'Or au Juste Prix",
  adresse: "4 Grande Rue 74160 St Julien en Genevois",
  telephone: "06 78 87 75 78",
  details: "SAS au capital de 5 000,00 \u20AC",
  siret_rcs: "928 126 390 R.C.S. Thonon-les-Bains",
};

import { getSettingServer } from "@/lib/settings-server";

/**
 * Refresh SOCIETE from settings. Call once before generating a PDF batch.
 * All PDF templates reference the same SOCIETE object, so mutating it in-place
 * means every template automatically picks up the latest values.
 */
export async function refreshSociete(): Promise<void> {
  const company = await getSettingServer("company");
  if (!company) return;
  SOCIETE.nom = company.nom || SOCIETE.nom;
  SOCIETE.adresse = [company.adresse, company.code_postal, company.ville].filter(Boolean).join(" ") || SOCIETE.adresse;
  SOCIETE.telephone = company.telephone || SOCIETE.telephone;
  SOCIETE.details = company.forme_juridique || SOCIETE.details;
  SOCIETE.siret_rcs = company.siret_rcs || SOCIETE.siret_rcs;
}

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

// Depot-vente specific types
export interface DepotVenteReferenceLigne {
  designation: string;
  description: string;
  prixNetDeposant: number;
  prixAffichePublic: number;
}

export interface ConfieReferenceLigne {
  titre: string;
  designation: string;
  quantite: number;
  poids: number;
  prixAchat: number;
  prixVente: number;
}

// CDV contract clauses
export const CDV_CLAUSES: Array<{ title: string; body: string }> = [
  {
    title: "OBJET DU CONTRAT",
    body: "Le présent contrat est établi à l'occasion du dépôt de marchandises appartenant au déposant-vendeur dans le local commercial du dépositaire. A charge pour ce dernier de les vendre en son nom et pour son compte contre une rémunération de ses services d'intermédiaire.\n\nSi le dépositaire-vendeur devait déposer de nouveaux objets, ces derniers feraient alors l'objet d'un nouveau contrat.",
  },
  {
    title: "DESCRIPTION DES MARCHANDISES",
    body: "Les marchandises faisant l'objet du contrat sont détaillées dans la fiche de dépôt ci-jointe.",
  },
  {
    title: "DURÉE DU CONTRAT",
    body: "Le présent contrat est conclu pour la durée de 1 (un) an à compter de la date de signature. Il peut être résilié à tout moment, par l'une ou l'autre des parties, à charge pour la partie qui prendra l'initiative de la rupture de la notifier par lettre recommandée avec AR avec préavis de 7 jours calendaires.\n\nEn cas de résiliation à l'initiative du déposant-vendeur, ce dernier s'engage à retirer ses biens dans un délai de 15 jours à compter de la réception de la notification. Une indemnité forfaitaire de 10 % du prix de vente public TTC sera alors due par le déposant-vendeur.",
  },
  {
    title: "PRIX DE VENTE",
    body: "Le prix de vente des articles au client final est fixé d'un commun accord. Il est mentionné pour chaque article sur la fiche de dépôt annexée. Le prix de vente est entendu TTC.",
  },
  {
    title: "CONDITIONS DE VENTE",
    body: "Le dépositaire se réserve le droit de refuser des articles. Il s'engage à exposer les objets (vitrines, site internet). En cas de vente à distance, il gère l'expédition. La SAS L'Or au Juste Prix agit en qualité d'intermédiaire.",
  },
  {
    title: "RÉPARATIONS ET NETTOYAGE",
    body: "Si les objets ne sont pas propres, un forfait de 20 euros TTC par objet sera facturé. Les réparations éventuelles seront déduites du prix final ou facturées au réel si l'objet n'est pas vendu.",
  },
  {
    title: "RÉMUNÉRATION DU DÉPOSITAIRE",
    body: "La commission du dépositaire s'élève à 40 % du prix de vente public.",
  },
  {
    title: "SOLDES ET PROMOTIONS",
    body: "Le dépositaire peut réaliser des soldes (-20% à -50%) ou promotions (-10% à -30%) selon les périodes, sans préavis systématique au déposant.",
  },
  {
    title: "ASSURANCES",
    body: "En cas de vol, casse ou incendie, le dépositaire rembourse le montant « prix de vente demandé » indiqué sur la fiche.",
  },
  {
    title: "PAIEMENT ET RESTITUTION",
    body: "Règlement sous 15 jours. En fin de contrat, les invendus non réclamés après 1 an et 1 jour suivant notification pourront être cédés, détruits ou conservés (frais de garde : 10 € TTC/mois).",
  },
  {
    title: "LITIGES",
    body: "Tribunal compétent : Thonon-les-Bains. Droit français applicable. En signant, le déposant accepte toutes les conditions.",
  },
];

// Legal texts
export const TEXTE_CONDITIONS_CONFIE =
  "Le vendeur déclare avoir atteint la majorité légale, être le propriétaire légitime des biens, agir à titre privé et que ces biens ne proviennent d'aucune activité illicite. La taxe sur les métaux précieux est acquittée par nos soins.";

export const TEXTE_CONDITIONS_ACHAT =
  "Le vendeur déclare avoir atteint la majorité légale, être le propriétaire légitime des biens, agir à titre privé et que ces biens ne proviennent d'aucune activité illicite. La taxe sur les métaux précieux (11,5%) est acquittée par nos soins.";

export const TEXTE_CONDITIONS_CONTRAT =
  `Si vous souhaitez exercer votre droit de rétractation dans les 48 heures à compter de la signature du contrat vous pouvez utiliser le formulaire détachable prévu à cet effet ou toute autre déclaration dénuée d'ambigüité exprimant votre volonté de vous rétracter conformément à l'article R224-4.

Conformément à l'article R.224-7, pour exercer son droit de rétractation prévu par l'article L.224-99, le consommateur-vendeur, sans avoir à justifier de motifs, remet au professionnel en main propre le formulaire détachable ou toute autre déclaration dénuée d'ambiguïté exprimant sa volonté de se rétracter, au plus tard 48H à compter du jour et de l'heure de la signature du contrat, ou toute autre moyen permettant d'attester de la date et l'heure d'envoi au plus tard 48h à compter du jour et de l'heure de la signature du contrat. Si le délai expire un samedi, un dimanche, un jour chômé ou un jour férié, il est prorogé jusqu'au premier jour ouvrable suivant à la même heure. L'envoi ou la remise du formulaire au professionnel et dans le délai imparti a pour effet d'annuler l'opération d'achat. A défaut le contrat est conclu définitivement.

Rappel : Conformément au 2eme alinéa de l'article L.224-9, l'exercice du droit de rétractation met fin aux obligations des parties. Le consommateur doit alors rembourser au professionnel le prix perçu, et, en contrepartie, ce dernier doit lui restituer le ou les objets achetés. A défaut de restituer le ou les objets achetés, le professionnel verse au consommateur une somme équivalente au double prix de vente perçu pour le bien ou les objets achetés. Conformément au troisième alinéa du même article, le consommateur-vendeur ne dispose pas d'un droit de rétractation pour les opérations d'or d'investissement.`;

export const TEXTE_DEVIS_VALIDITE =
  "Ce devis est valable 48 heures à compter de sa date d'émission. Passé ce délai, les prix pourront être révisés en fonction du cours des métaux précieux. Les prix indiqués sont basés sur les cours en vigueur au moment de l'établissement du devis.";

// Quittance dépôt-vente types
export interface QuittanceDepotVenteLigne {
  designation: string;
  description: string;
  prixVentePublic: number;
  netDeposant: number;
  commission: number;
}

// Facture de vente types
export interface FactureVenteLigne {
  titre: string;
  designation: string;
  poids: number;
  quantite: number;
  prixUnitaireHT: number;
  totalHT: number;
}

export const TEXTE_CONDITIONS_QUITTANCE_DV =
  "Ce document atteste du règlement des sommes dues au déposant-vendeur suite à la vente des articles ci-dessus, conformément au contrat de dépôt-vente en vigueur. La commission du dépositaire a été déduite du montant brut conformément aux conditions contractuelles.";

export const TEXTE_CGV_VENTE =
  "La TVA n'est pas applicable pour des achats ou vente d'or d'investissement.\n1) Exonération suivant l'article 298 sexdecies A du CGI. AUTOLIQUIDATION TVA\n2) Opération bénéficiant du régime de l'autoliquidation prévue à l'article 283-2 sexis du CGI.";

// Bon de commande fonderie types
export interface BonCommandeLigne {
  designation: string;
  metal: string;
  poids: number;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface FonderieInfo {
  nom: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  telephone?: string;
  email?: string;
}

export const TEXTE_CONDITIONS_BON_COMMANDE =
  "Ce bon de commande est émis par L'Or au Juste Prix pour l'achat d'or d'investissement. Les prix sont basés sur les cours en vigueur au moment de l'établissement de la commande. Merci de confirmer la réception de cette commande par retour.";

// Bon de livraison fonderie types
export interface BonLivraisonLigneData {
  designation: string;
  metal: string;
  titrage: string;
  poids: number;
  cours: number;
  valeur: number;
}

export interface BonLivraisonGroupData {
  metal: string;
  titrage: string;
  lignes: BonLivraisonLigneData[];
  sousTotal: { pieces: number; poids: number; valeur: number };
}

export const TEXTE_CONDITIONS_BON_LIVRAISON =
  "Ce bon de livraison atteste de la remise des articles ci-dessus à la fonderie désignée pour traitement (fonte). Les poids et titrages indiqués sont ceux déclarés lors de l'expertise. La fonderie s'engage à communiquer les résultats de ses tests dans les meilleurs délais.";

export const TEXTE_CGV_ACOMPTE =
  "Facture d'acompte de 10% sur commande d'or d'investissement. Le solde de 90% est exigible sous 48 heures à compter de la date de la présente facture. À défaut de règlement dans ce délai, la commande sera automatiquement annulée et l'acompte restera acquis.\n\nLa TVA n'est pas applicable pour des achats ou vente d'or d'investissement.\n1) Exonération suivant l'article 298 sexdecies A du CGI. AUTOLIQUIDATION TVA\n2) Opération bénéficiant du régime de l'autoliquidation prévue à l'article 283-2 sexis du CGI.";
