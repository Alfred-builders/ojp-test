import React from "react";
import { Document, Page, View, Text, pdf, Image } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "./logo";
import { styles as s, W_QDV, fmt } from "./shared-styles";
import {
  TEXTE_CONDITIONS_QUITTANCE_DV, SOCIETE,
  type ClientInfo, type DossierInfo, type QuittanceDepotVenteLigne,
} from "./blocks";

export interface QuittanceDepotVenteData {
  numero: string;
  client: ClientInfo;
  dossier: DossierInfo;
  lignes: QuittanceDepotVenteLigne[];
  totalVentes: number;
  totalCommission: number;
  netAPayer: number;
  venteDossierNumero: string;
}

function Doc({ data }: { data: QuittanceDepotVenteData }) {
  const { client, dossier, lignes, totalVentes, totalCommission, netAPayer } = data;
  const h = React.createElement;
  const fullName = `${client.civilite} ${client.prenom} ${client.nom}`;

  return h(Document, null, h(Page, { size: "A4", style: s.page },
    // Header
    h(View, { style: s.header },
      h(Image, { style: s.logo, src: LOGO_BASE64 }),
      h(View, { style: s.headerRight },
        h(Text, { style: s.companyName }, SOCIETE.nom.toUpperCase()),
        h(Text, { style: s.companyLine }, SOCIETE.adresse),
        h(Text, { style: s.companyLine }, SOCIETE.telephone))),
    // Info
    h(View, { style: s.infoSection },
      h(View, { style: s.clientBlock },
        h(Text, { style: s.label }, "D\u00C9POSANT"),
        h(Text, { style: s.clientName }, fullName),
        client.adresse ? h(Text, { style: s.clientLine }, client.adresse) : null,
        (client.codePostal || client.ville) ? h(Text, { style: s.clientLine }, [client.codePostal, client.ville].filter(Boolean).join(" ")) : null,
        client.documentType && client.documentNumber ? h(Text, { style: s.clientMuted }, `${client.documentType} : ${client.documentNumber}`) : null,
        h(Text, { style: s.clientMuted }, `Dossier : ${dossier.numeroDossier}`),
        h(Text, { style: s.qdvRefText }, `Vente : ${data.venteDossierNumero}`)),
      h(View, { style: s.docRight },
        h(Text, { style: s.docTitle }, "QUITTANCE"),
        h(Text, { style: { fontSize: 8, color: "#777777", textAlign: "right", marginBottom: 8 } }, "D\u00C9P\u00D4T-VENTE"),
        h(Text, { style: s.infoLabel }, "NUM\u00C9RO"),
        h(Text, { style: s.infoValue }, data.numero),
        h(Text, { style: s.infoLabel }, "DATE"),
        h(Text, { style: s.infoValue }, `${dossier.date}   ${dossier.heure}`))),
    // Table
    h(View, { style: s.tableWrap },
      h(View, { style: s.tableHead },
        h(Text, { style: [s.th, { width: W_QDV.des }] }, "D\u00C9SIGNATION"),
        h(Text, { style: [s.th, { width: W_QDV.desc }] }, "DESCRIPTION"),
        h(Text, { style: [s.th, { width: W_QDV.prixVente, textAlign: "right" }] }, "PRIX VENTE"),
        h(Text, { style: [s.th, { width: W_QDV.commission, textAlign: "right" }] }, "COMMISSION"),
        h(Text, { style: [s.th, { width: W_QDV.netDeposant, textAlign: "right" }] }, "NET D\u00C9POSANT")),
      ...lignes.map((r, i) =>
        h(View, { key: i, style: s.tableRow },
          h(Text, { style: [s.tdBold, { width: W_QDV.des }] }, r.designation),
          h(Text, { style: [s.td, { width: W_QDV.desc }] }, r.description),
          h(Text, { style: [s.td, { width: W_QDV.prixVente, textAlign: "right" }] }, fmt(r.prixVentePublic)),
          h(Text, { style: [s.td, { width: W_QDV.commission, textAlign: "right" }] }, fmt(r.commission)),
          h(Text, { style: [s.tdBold, { width: W_QDV.netDeposant, textAlign: "right" }] }, fmt(r.netDeposant))))),
    // Bottom 2 columns
    h(View, { style: s.bottom },
      h(View, { style: s.bottomLeft },
        h(Text, { style: s.sectionLabel }, "CONDITIONS"),
        h(Text, { style: s.condText }, TEXTE_CONDITIONS_QUITTANCE_DV)),
      h(View, { style: s.bottomRight },
        h(View, { style: s.totGoldLine }),
        h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, "Total ventes"), h(Text, { style: s.totValue }, fmt(totalVentes))),
        h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, "Commission"), h(Text, { style: s.totValue }, `-${fmt(totalCommission)}`)),
        h(View, { style: s.totSep }),
        h(View, { style: s.netRow }, h(Text, { style: s.netLabel }, "NET \u00C0 PAYER"), h(Text, { style: s.netValue }, fmt(netAPayer))),
        h(View, { style: s.sigBlock }, h(Text, { style: s.sigLabel }, "Signature du d\u00E9posant"), h(View, { style: s.sigLine })))),
    // Footer
    h(View, { style: s.footer, fixed: true },
      h(Text, { style: s.footerText }, `${SOCIETE.nom}  \u00B7  ${SOCIETE.details}`),
      h(Text, { style: s.footerText }, `${SOCIETE.adresse}  \u00B7  ${SOCIETE.telephone}`))));
}

export async function generateQuittanceDepotVente(data: QuittanceDepotVenteData): Promise<Blob> {
  return await pdf(React.createElement(Doc, { data }) as React.ReactElement<never>).toBlob();
}
