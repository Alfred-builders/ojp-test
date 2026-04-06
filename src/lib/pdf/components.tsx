import React from "react";
import { View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import {
  GOLD, DARK, GRAY, LIGHT_GRAY,
  SOCIETE, formatCurrency,
  type DocumentInfo, type ClientInfo, type DossierInfo,
  type ReferenceLigne, type TotauxInfo,
} from "./blocks";


// ============================================================
// Styles
// ============================================================
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  logo: { width: 80, height: 60, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GOLD },
  docNumero: { fontSize: 10, color: GRAY, marginTop: 4 },
  // Client block
  clientBox: {
    borderWidth: 0.5,
    borderColor: LIGHT_GRAY,
    borderRadius: 3,
    padding: 10,
    paddingLeft: 12,
    marginBottom: 10,
    marginLeft: 60,
    width: 220,
  },
  clientLabel: { fontSize: 7, color: GOLD, fontFamily: "Helvetica-Bold", marginBottom: 3, letterSpacing: 0.5 },
  clientName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 2 },
  clientDetail: { fontSize: 8, color: GRAY, marginBottom: 1 },
  clientGold: { fontSize: 8, color: GOLD, marginTop: 1 },
  // Dossier info
  dossierBlock: { alignItems: "flex-end", marginBottom: 14 },
  dossierText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },
  dossierGray: { fontSize: 9, color: GRAY, marginTop: 2 },
  // Table
  tableTopLine: { borderBottomWidth: 1, borderBottomColor: GOLD, marginBottom: 1 },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: LIGHT_GRAY,
  },
  tableHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY, letterSpacing: 0.3 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.3,
    borderBottomColor: LIGHT_GRAY,
  },
  tableCell: { fontSize: 8, color: GRAY },
  tableCellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: DARK },
  // Bottom section: 2 columns (left: recap + conditions, right: totaux + signature)
  bottomSection: {
    flexDirection: "row",
    marginTop: 8,
  },
  bottomLeft: { flex: 1, paddingRight: 15 },
  bottomRight: { width: 210 },
  // Recap
  recapTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 4 },
  recapText: { fontSize: 8, color: GRAY },
  // Totaux
  totauxRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  totauxLabel: { fontSize: 9, color: GRAY, textAlign: "right" },
  totauxValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },
  totauxSep: { borderBottomWidth: 0.5, borderBottomColor: GOLD, marginVertical: 2 },
  totauxSep2: { borderBottomWidth: 1.5, borderBottomColor: GOLD, marginVertical: 1 },
  netLabel: { fontSize: 13, fontFamily: "Helvetica-Bold", color: DARK },
  netValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },
  // Signature
  signatureLabel: { fontSize: 8, color: GRAY, fontFamily: "Helvetica-Oblique", textAlign: "right", marginTop: 10 },
  signatureLine: { borderBottomWidth: 0.5, borderBottomColor: LIGHT_GRAY, borderStyle: "dashed", width: 150, alignSelf: "flex-end", marginTop: 25 },
  // Conditions
  condSep: { borderBottomWidth: 0.5, borderBottomColor: LIGHT_GRAY, marginVertical: 6 },
  condTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 4, letterSpacing: 0.3 },
  condText: { fontSize: 6.5, color: GRAY, lineHeight: 1.5 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 12,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: GOLD,
    paddingTop: 5,
    alignItems: "center",
  },
  footerBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: DARK },
  footerText: { fontSize: 6.5, color: GRAY, marginTop: 1 },
  // Bordereau
  bordereauCut: { borderBottomWidth: 1, borderBottomColor: GRAY, borderStyle: "dashed", marginTop: 30, marginBottom: 20 },
  bordereauTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "center", marginBottom: 10 },
  bordereauIntro: { fontSize: 8, color: GRAY, marginBottom: 10, lineHeight: 1.5 },
  bordereauFieldRow: { flexDirection: "row", marginBottom: 4 },
  bordereauFieldLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, width: 100 },
  bordereauFieldValue: { fontSize: 9, color: GRAY },
  // Helpers
  spaceBetween: { flexDirection: "row" as const, justifyContent: "space-between" as const },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mt8: { marginTop: 8 },
});

// Column widths
const COL = {
  designation: "28%",
  metal: "10%",
  titrage: "10%",
  poids: "10%",
  qte: "7%",
  taxe: "10%",
  pu: "12%",
  pt: "13%",
} as const;

// ============================================================
// Components
// ============================================================

export function PdfHeader({ info }: { info: DocumentInfo }) {
  return React.createElement(View, { style: s.headerRow },
    React.createElement(Image, { style: s.logo, src: "/logo-dark.png" }),
    React.createElement(View, { style: s.headerRight },
      React.createElement(Text, { style: s.docTitle }, info.title),
      React.createElement(Text, { style: s.docNumero }, `N\u00B0 ${info.numero}`)
    )
  );
}

export function PdfClientBlock({ client, dossierNumero }: { client: ClientInfo; dossierNumero?: string }) {
  const fullName = `${client.civilite} ${client.prenom} ${client.nom}`;
  const children = [
    React.createElement(Text, { key: "label", style: s.clientLabel }, "CLIENT"),
    React.createElement(Text, { key: "name", style: s.clientName }, fullName),
  ];

  if (client.adresse) {
    children.push(React.createElement(Text, { key: "addr", style: s.clientDetail }, client.adresse));
  }
  if (client.codePostal || client.ville) {
    children.push(React.createElement(Text, { key: "city", style: s.clientDetail },
      [client.codePostal, client.ville].filter(Boolean).join(" ")));
  }
  if (client.documentType && client.documentNumber) {
    children.push(React.createElement(Text, { key: "doc", style: s.clientGold },
      `${client.documentType} : ${client.documentNumber}`));
  }
  if (dossierNumero) {
    children.push(React.createElement(Text, { key: "dossier", style: s.clientGold },
      `Dossier : ${dossierNumero}`));
  }

  return React.createElement(View, { style: s.clientBox }, ...children);
}

export function PdfDossierBlock({ dossier }: { dossier: DossierInfo }) {
  return React.createElement(View, { style: s.dossierBlock },
    React.createElement(Text, { style: s.dossierText },
      `Date : ${dossier.date} | Heure : ${dossier.heure}`),
    React.createElement(Text, { style: s.dossierGray },
      `R\u00E8glement : ${dossier.reglement || ""}`)
  );
}

export function PdfTable({ lignes }: { lignes: ReferenceLigne[] }) {
  const headerCells = [
    { label: "D\u00C9SIGNATION", width: COL.designation },
    { label: "M\u00C9TAL", width: COL.metal },
    { label: "TITRAGE", width: COL.titrage },
    { label: "POIDS (G)", width: COL.poids, align: "right" as const },
    { label: "QT\u00C9", width: COL.qte, align: "center" as const },
    { label: "TAXE", width: COL.taxe, align: "center" as const },
    { label: "P.U BRUT", width: COL.pu, align: "right" as const },
    { label: "P.T BRUT", width: COL.pt, align: "right" as const },
  ];

  return React.createElement(View, { style: s.mb8 },
    React.createElement(View, { style: s.tableTopLine }),
    React.createElement(View, { style: s.tableHeader },
      ...headerCells.map((c, i) =>
        React.createElement(Text, {
          key: i,
          style: [s.tableHeaderCell, { width: c.width, textAlign: c.align }],
        }, c.label)
      )
    ),
    ...lignes.map((l, i) =>
      React.createElement(View, { key: i, style: s.tableRow },
        React.createElement(Text, { style: [s.tableCellBold, { width: COL.designation }] }, l.designation),
        React.createElement(Text, { style: [s.tableCell, { width: COL.metal }] }, l.metal),
        React.createElement(Text, { style: [s.tableCell, { width: COL.titrage }] }, l.titrage),
        React.createElement(Text, { style: [s.tableCell, { width: COL.poids, textAlign: "right" }] }, String(l.poids)),
        React.createElement(Text, { style: [s.tableCell, { width: COL.qte, textAlign: "center" }] }, String(l.quantite)),
        React.createElement(Text, { style: [s.tableCell, { width: COL.taxe, textAlign: "center" }] }, l.taxe),
        React.createElement(Text, { style: [s.tableCellBold, { width: COL.pu, textAlign: "right" }] }, formatCurrency(l.prixUnitaire)),
        React.createElement(Text, { style: [s.tableCellBold, { width: COL.pt, textAlign: "right" }] }, formatCurrency(l.prixTotal))
      )
    )
  );
}

export function PdfRecapTitrage({ lignes }: { lignes: ReferenceLigne[] }) {
  const groups: Record<string, number> = {};
  for (const l of lignes) {
    const key = `${l.metal} ${l.titrage}`;
    groups[key] = (groups[key] ?? 0) + l.poids * l.quantite;
  }

  const text = Object.entries(groups)
    .map(([key, poids]) => `${key}: ${poids.toFixed(1)}g`)
    .join("  |  ");

  return React.createElement(View, { style: s.mb8 },
    React.createElement(Text, { style: s.recapTitle }, "R\u00C9CAPITULATIF POIDS"),
    React.createElement(Text, { style: s.recapText }, text)
  );
}

export function PdfTotaux({ totaux }: { totaux: TotauxInfo }) {
  return React.createElement(View, null,
    React.createElement(View, { style: s.totauxRow },
      React.createElement(Text, { style: s.totauxLabel }, "TOTAL BRUT"),
      React.createElement(Text, { style: s.totauxValue }, formatCurrency(totaux.totalBrut))
    ),
    React.createElement(View, { style: s.totauxRow },
      React.createElement(Text, { style: s.totauxLabel }, "TAXE (TMP+CRDS)"),
      React.createElement(Text, { style: s.totauxValue }, formatCurrency(totaux.taxe))
    ),
    React.createElement(View, { style: s.totauxSep }),
    React.createElement(View, { style: s.totauxSep2 }),
    React.createElement(View, { style: [s.totauxRow, { marginTop: 4 }] },
      React.createElement(Text, { style: s.netLabel }, "NET \u00C0 PAYER"),
      React.createElement(Text, { style: s.netValue }, formatCurrency(totaux.netAPayer))
    )
  );
}

export function PdfSignature({ label }: { label?: string }) {
  return React.createElement(View, null,
    React.createElement(Text, { style: s.signatureLabel }, label ?? "Signature du vendeur :"),
    React.createElement(View, { style: s.signatureLine })
  );
}

export function PdfConditions({ title, text }: { title: string; text: string }) {
  return React.createElement(View, null,
    React.createElement(View, { style: s.condSep }),
    React.createElement(Text, { style: s.condTitle }, title),
    React.createElement(Text, { style: s.condText }, text)
  );
}

/**
 * Bottom section with 2 columns:
 * Left: recap titrage + conditions
 * Right: totaux + signature
 */
export function PdfBottomSection({
  lignes,
  totaux,
  condTitle,
  condText,
}: {
  lignes: ReferenceLigne[];
  totaux: TotauxInfo;
  condTitle: string;
  condText: string;
}) {
  return React.createElement(View, { style: s.bottomSection },
    // Left column
    React.createElement(View, { style: s.bottomLeft },
      React.createElement(PdfRecapTitrage, { lignes }),
      React.createElement(PdfConditions, { title: condTitle, text: condText })
    ),
    // Right column
    React.createElement(View, { style: s.bottomRight },
      React.createElement(PdfTotaux, { totaux }),
      React.createElement(PdfSignature, null)
    )
  );
}

export function PdfFooter() {
  return React.createElement(View, { style: s.footer, fixed: true },
    React.createElement(Text, { style: s.footerBold }, SOCIETE.nom),
    React.createElement(Text, { style: s.footerText },
      `${SOCIETE.adresse} \u2022 ${SOCIETE.telephone}`),
    React.createElement(Text, { style: s.footerText }, SOCIETE.details)
  );
}

export function PdfBordereauRetractation({
  numeroContrat, dateContrat, nomClient,
}: {
  numeroContrat: string; dateContrat: string; nomClient: string;
}) {
  const fields = [
    { label: "N\u00B0 de Contrat :", value: numeroContrat },
    { label: "Date du contrat :", value: dateContrat },
    { label: "Nom du client :", value: nomClient },
    { label: "Vendeur :", value: SOCIETE.nom },
  ];

  return React.createElement(View, null,
    React.createElement(View, { style: s.bordereauCut }),
    React.createElement(Text, { style: s.bordereauTitle },
      "BORDEREAU DE R\u00C9TRACTATION\n(Article L. 224-99 du Code de la consommation)"),
    React.createElement(Text, { style: s.bordereauIntro },
      "Conform\u00E9ment \u00E0 mon droit de r\u00E9tractation de 48H apr\u00E8s signature du contrat, je vous notifie par ce bordereau que j'exerce mon droit de r\u00E9tractation et que j'annule le contrat :"),
    React.createElement(View, { style: s.mb12 },
      ...fields.map((f, i) =>
        React.createElement(View, { key: i, style: s.bordereauFieldRow },
          React.createElement(Text, { style: s.bordereauFieldLabel }, f.label),
          React.createElement(Text, { style: s.bordereauFieldValue }, f.value)
        )
      )
    ),
    React.createElement(View, { style: [s.spaceBetween, s.mt8] },
      React.createElement(View, null,
        React.createElement(Text, { style: [s.tableCell, s.mb4] }, "Fait le : ..... / ..... / .........."),
        React.createElement(Text, { style: s.tableCell }, "\u00E0 : ..... h .....")
      ),
      React.createElement(View, { style: { alignItems: "flex-end" } },
        React.createElement(Text, { style: s.signatureLabel }, "Signature du client :"),
        React.createElement(View, { style: { borderBottomWidth: 0.5, borderBottomColor: DARK, width: 150, marginTop: 25 } })
      )
    )
  );
}

export { s as pdfStyles };
