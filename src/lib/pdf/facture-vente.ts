import React from "react";
import { Document, Page, View, Text, pdf, Image } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "./logo";
import { styles as s, W_FVE, C, fmt } from "./shared-styles";
import {
  TEXTE_CGV_VENTE, SOCIETE,
  type ClientInfo, type DossierInfo, type FactureVenteLigne,
} from "./blocks";

export interface FactureVenteData {
  numero: string;
  client: ClientInfo;
  dossier: DossierInfo;
  lignes: FactureVenteLigne[];
  totalHT: number;
  tva: number;
  totalTTC: number;
  modeReglement: string;
}

function Doc({ data }: { data: FactureVenteData }) {
  const { client, dossier, lignes, totalHT, tva, totalTTC } = data;
  const h = React.createElement;
  const fullName = `${client.civilite} ${client.prenom} ${client.nom}`;

  return h(Document, null, h(Page, { size: "A4", style: s.page },
    // Header: Logo left, Title right
    h(View, { style: s.header },
      h(Image, { style: s.logo, src: LOGO_BASE64 }),
      h(View, { style: s.headerRight },
        h(Text, { style: s.fveTitle }, "FACTURE DE VENTE"),
        h(Text, { style: s.fveNumero }, `N\u00B0 ${data.numero}`))),

    // Client box with gold left border
    h(View, { style: s.fveClientBox },
      h(Text, { style: { fontSize: 6.5, fontFamily: "Courier-Bold", color: C.gray, marginBottom: 3, letterSpacing: 0.5 } }, "CLIENT"),
      h(Text, { style: { fontSize: 10, fontFamily: "Courier-Bold", color: C.black, marginBottom: 1 } }, fullName),
      client.adresse ? h(Text, { style: { fontSize: 8, color: C.gray, marginBottom: 1 } }, client.adresse) : null,
      (client.codePostal || client.ville)
        ? h(Text, { style: { fontSize: 8, color: C.gray, marginBottom: 1 } }, [client.codePostal, client.ville].filter(Boolean).join(" "))
        : null,
      client.documentType && client.documentNumber
        ? h(Text, { style: { fontSize: 7, color: C.grayLight, marginTop: 2 } }, `${client.documentType} : ${client.documentNumber}`)
        : null,
      h(Text, { style: { fontSize: 7, color: C.grayLight, marginTop: 1 } }, `Dossier : ${dossier.numeroDossier}`)),

    // Date / Heure / Paiement (right-aligned)
    h(View, { style: { alignItems: "flex-end", marginBottom: 20 } },
      h(Text, { style: s.fveDateRow }, `Date : ${dossier.date} | Heure : ${dossier.heure}`),
      h(Text, { style: s.fveDateRow }, `Paiement : ${data.modeReglement || ""}`)),

    // Table
    h(View, { style: s.tableWrap },
      h(View, { style: s.tableHead },
        h(Text, { style: [s.th, { width: W_FVE.titre }] }, "TITRE"),
        h(Text, { style: [s.th, { width: W_FVE.des }] }, "D\u00C9SIGNATION"),
        h(Text, { style: [s.th, { width: W_FVE.poids, textAlign: "right" }] }, "POIDS (G)"),
        h(Text, { style: [s.th, { width: W_FVE.qte, textAlign: "center" }] }, "QT\u00C9"),
        h(Text, { style: [s.th, { width: W_FVE.puHT, textAlign: "right" }] }, "P.U HT"),
        h(Text, { style: [s.th, { width: W_FVE.totalHT, textAlign: "right" }] }, "TOTAL HT")),
      ...lignes.map((r, i) =>
        h(View, { key: i, style: s.tableRow },
          h(Text, { style: [s.tdBold, { width: W_FVE.titre }] }, r.titre),
          h(Text, { style: [s.td, { width: W_FVE.des }] }, r.designation),
          h(Text, { style: [s.td, { width: W_FVE.poids, textAlign: "right" }] }, r.poids ? `${r.poids}` : ""),
          h(Text, { style: [s.td, { width: W_FVE.qte, textAlign: "center" }] }, String(r.quantite)),
          h(Text, { style: [s.tdBold, { width: W_FVE.puHT, textAlign: "right" }] }, fmt(r.prixUnitaireHT)),
          h(Text, { style: [s.tdBold, { width: W_FVE.totalHT, textAlign: "right" }] }, fmt(r.totalHT))))),

    // Totals (right-aligned)
    h(View, { style: { alignItems: "flex-end", marginTop: 10 } },
      h(View, { style: { width: 200 } },
        h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, "TOTAL HT"), h(Text, { style: s.totValue }, fmt(totalHT))),
        h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, "TVA"), h(Text, { style: s.totValue }, fmt(tva))),
        h(View, { style: s.totGoldLine }),
        h(View, { style: s.netRow }, h(Text, { style: s.netLabel }, "TOTAL TTC"), h(Text, { style: s.netValue }, fmt(totalTTC))))),

    // CGV
    h(View, { style: { marginTop: 30 } },
      h(Text, { style: s.fveCgvTitle }, "CONDITIONS G\u00C9N\u00C9RALES DE VENTES"),
      h(Text, { style: s.fveCgvText }, TEXTE_CGV_VENTE)),

    // Signature
    h(Text, { style: s.fveSigLabel }, "Signature :"),

    // Cut line
    h(View, { style: s.fveCutLine }),

    // Footer
    h(View, { style: s.footer, fixed: true },
      h(Text, { style: s.footerText }, `${SOCIETE.nom}`),
      h(Text, { style: s.footerText }, `${SOCIETE.adresse}  \u00B7  ${SOCIETE.telephone}`),
      h(Text, { style: s.footerText }, `${SOCIETE.details}`))));
}

export async function generateFactureVente(data: FactureVenteData): Promise<Blob> {
  return await pdf(React.createElement(Doc, { data }) as React.ReactElement<never>).toBlob();
}
