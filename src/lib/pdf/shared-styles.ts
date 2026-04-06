import { StyleSheet } from "@react-pdf/renderer";

export const C = {
  black: "#1A1A1A",
  text: "#333333",
  gray: "#777777",
  grayLight: "#AAAAAA",
  line: "#E0E0E0",
  gold: "#B8963E",
  white: "#FFFFFF",
};

export const styles = StyleSheet.create({
  page: { fontFamily: "Courier", fontSize: 8, color: C.text, backgroundColor: C.white, paddingTop: 35, paddingBottom: 45, paddingHorizontal: 45 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 },
  logo: { width: 120, height: 60 },
  headerRight: { alignItems: "flex-end" },
  companyName: { fontSize: 9, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 5 },
  companyLine: { fontSize: 7, color: "#777777", textAlign: "right" },
  infoSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 25 },
  clientBlock: { maxWidth: 230 },
  label: { fontSize: 7, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 5 },
  clientName: { fontSize: 10, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 1 },
  clientLine: { fontSize: 8, color: "#777777", marginBottom: 1 },
  clientMuted: { fontSize: 7, color: "#AAAAAA", marginTop: 3 },
  docRight: { alignItems: "flex-end", maxWidth: 250 },
  docTitle: { fontSize: 20, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 12 },
  infoLabel: { fontSize: 6.5, fontFamily: "Courier-Bold", color: "#777777", marginBottom: 2, textAlign: "right" },
  infoValue: { fontSize: 8, color: "#333333", textAlign: "right", marginBottom: 8 },
  tableWrap: { marginBottom: 6 },
  tableHead: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#1A1A1A", paddingBottom: 5 },
  th: { fontSize: 6, fontFamily: "Courier-Bold", color: "#1A1A1A" },
  tableRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.3, borderBottomColor: "#E0E0E0" },
  td: { fontSize: 8, color: "#777777" },
  tdBold: { fontSize: 8, color: "#1A1A1A" },
  bottom: { flexDirection: "row", marginTop: 8 },
  bottomLeft: { flex: 1, paddingRight: 20 },
  bottomRight: { width: 200 },
  totGoldLine: { borderBottomWidth: 1, borderBottomColor: "#B8963E", marginBottom: 10 },
  totRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  totLabel: { fontSize: 8, color: "#777777" },
  totValue: { fontSize: 8, color: "#333333" },
  totSep: { borderBottomWidth: 0.3, borderBottomColor: "#E0E0E0", marginVertical: 4 },
  netRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  netLabel: { fontSize: 12, fontFamily: "Courier-Bold", color: "#1A1A1A" },
  netValue: { fontSize: 12, fontFamily: "Courier-Bold", color: "#1A1A1A" },
  sectionLabel: { fontSize: 7, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 4 },
  recapText: { fontSize: 7, color: "#777777", marginBottom: 12 },
  condText: { fontSize: 6.5, color: "#AAAAAA", lineHeight: 1.5 },
  sigBlock: { marginTop: 14, alignItems: "flex-end" },
  sigLabel: { fontSize: 7, color: "#777777", fontFamily: "Courier-Oblique" },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: "#E0E0E0", width: 140, marginTop: 25 },
  footer: { position: "absolute", bottom: 18, left: 45, right: 45, borderTopWidth: 0.5, borderTopColor: "#B8963E", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6, color: "#AAAAAA" },
  // Contrat-specific
  condBlock: { marginTop: 16 },
  condTitle: { fontSize: 7, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 6 },
  condBody: { fontSize: 6, color: "#777777", lineHeight: 1.6 },
  // Bordereau
  bordereauCut: { borderBottomWidth: 1, borderBottomColor: "#777777", borderStyle: "dashed", marginTop: 30, marginBottom: 20 },
  bordereauTitle: { fontSize: 9, fontFamily: "Courier-Bold", color: "#1A1A1A", textAlign: "center", marginBottom: 10 },
  bordereauIntro: { fontSize: 7, color: "#777777", marginBottom: 12, lineHeight: 1.5 },
  bordereauFieldRow: { flexDirection: "row", marginBottom: 4 },
  bordereauFieldLabel: { fontSize: 8, fontFamily: "Courier-Bold", color: "#1A1A1A", width: 110 },
  bordereauFieldValue: { fontSize: 8, color: "#777777" },
  spaceBetween: { flexDirection: "row", justifyContent: "space-between" },
  mb4: { marginBottom: 4 },
  mt8: { marginTop: 8 },
  // CDV-specific styles
  cdvTitle: { fontSize: 18, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 4 },
  cdvNumero: { fontSize: 9, color: "#777777" },
  cdvTwoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 20 },
  cdvColLeft: { flex: 1, borderWidth: 0.5, borderColor: "#E0E0E0", padding: 10, borderRadius: 2 },
  cdvColRight: { flex: 1, borderWidth: 0.5, borderColor: "#E0E0E0", padding: 10, borderRadius: 2 },
  cdvColLabel: { fontSize: 6.5, fontFamily: "Courier-Bold", color: "#B8963E", marginBottom: 4, letterSpacing: 0.5 },
  cdvColName: { fontSize: 9, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 2 },
  cdvColLine: { fontSize: 7.5, color: "#777777", marginBottom: 1 },
  cdvClauseTitle: { fontSize: 6.5, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 3, marginTop: 8 },
  cdvClauseBody: { fontSize: 5.5, color: "#777777", lineHeight: 1.5 },
  cdvSignatureSection: { marginTop: 16, alignItems: "center" },
  cdvSignatureTitle: { fontSize: 7, fontFamily: "Courier-Bold", color: "#B8963E", textAlign: "center", marginBottom: 6 },
  cdvSignatureDate: { fontSize: 7, color: "#777777", textAlign: "center", marginBottom: 16 },
  cdvSignatureRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  cdvSignatureZone: { width: "40%" },
  cdvSignatureLabel: { fontSize: 7, fontFamily: "Courier-Bold", color: "#1A1A1A", marginBottom: 20 },
  // FVE-specific styles (facture de vente)
  fveTitle: { fontSize: 18, fontFamily: "Courier-Bold", color: "#B8963E" },
  fveNumero: { fontSize: 9, color: "#777777", marginTop: 2 },
  fveClientBox: { borderLeftWidth: 2, borderLeftColor: "#B8963E", paddingLeft: 12, paddingVertical: 8, marginBottom: 20 },
  fveDateRow: { textAlign: "right" as const, fontSize: 8, color: "#333333", marginBottom: 2 },
  fveCgvTitle: { fontSize: 7, fontFamily: "Courier-Bold", color: "#B8963E", marginBottom: 4 },
  fveCgvText: { fontSize: 6, color: "#777777", lineHeight: 1.5 },
  fveCutLine: { borderBottomWidth: 1, borderBottomColor: "#777777", borderStyle: "dashed" as const, marginVertical: 20 },
  fveSigLabel: { fontSize: 8, color: "#777777", textAlign: "center" as const, marginTop: 10, fontFamily: "Courier-Oblique" },
  // QDV-specific styles (quittance dépôt-vente)
  qdvRefText: { fontSize: 7, color: "#AAAAAA", marginTop: 3 },
});

export const W = {
  des: "26%", met: "9%", tit: "8%", poi: "8%", qte: "6%", tax: "9%", pu: "16%", pt: "18%",
};

// CDV column widths (page 2 table)
export const W_CDV = {
  des: "25%", desc: "35%", prixNet: "20%", prixPublic: "20%",
};

// CONF column widths
export const W_CONF = {
  titre: "12%", des: "28%", qte: "10%", poids: "12%", prixAchat: "18%", prixVente: "20%",
};

// QDV column widths (quittance dépôt-vente)
export const W_QDV = {
  des: "28%", desc: "24%", prixVente: "16%", commission: "16%", netDeposant: "16%",
};

// FVE column widths (facture de vente)
export const W_FVE = {
  titre: "12%", des: "34%", poids: "12%", qte: "8%", puHT: "16%", totalHT: "18%",
};

// BDL column widths (bon de livraison)
export const W_BDL = {
  des: "34%", poids: "14%", cours: "18%", valeur: "18%",
};

export function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  }).format(n).replace(/[\u202F\u00A0]/g, " ");
}
