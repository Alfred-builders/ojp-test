import React from "react";
import { Document, Page, View, Text, pdf, Image } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "./logo";
import { styles as s, W, fmt } from "./shared-styles";
import { TEXTE_CONDITIONS_ACHAT, SOCIETE, type ClientInfo, type DossierInfo, type ReferenceLigne, type TotauxInfo } from "./blocks";

export interface QuittanceRachatData {
  numero: string;
  client: ClientInfo;
  dossier: DossierInfo;
  references: ReferenceLigne[];
  totaux: TotauxInfo;
}

function Doc({ data }: { data: QuittanceRachatData }) {
  const { client, dossier, references, totaux } = data;
  const h = React.createElement;
  const fullName = `${client.civilite} ${client.prenom} ${client.nom}`;

  const groups: Record<string, number> = {};
  for (const r of references) {
    const k = r.titrage && r.titrage !== "—" ? `${r.metal} ${r.titrage}` : r.metal;
    groups[k] = (groups[k] ?? 0) + r.poids * r.quantite;
  }
  const recap = Object.entries(groups).map(([k, v]) => `${k}: ${v.toFixed(1)}g`).join("   \u00B7   ");

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
        h(Text, { style: s.label }, "CLIENT"),
        h(Text, { style: s.clientName }, fullName),
        client.adresse ? h(Text, { style: s.clientLine }, client.adresse) : null,
        (client.codePostal || client.ville) ? h(Text, { style: s.clientLine }, [client.codePostal, client.ville].filter(Boolean).join(" ")) : null,
        client.documentType && client.documentNumber ? h(Text, { style: s.clientMuted }, `${client.documentType} : ${client.documentNumber}`) : null,
        h(Text, { style: s.clientMuted }, `Dossier : ${dossier.numeroDossier}`)),
      h(View, { style: s.docRight },
        h(Text, { style: s.docTitle }, "QUITTANCE"),
        h(Text, { style: s.infoLabel }, "NUM\u00C9RO"),
        h(Text, { style: s.infoValue }, data.numero),
        h(Text, { style: s.infoLabel }, "DATE"),
        h(Text, { style: s.infoValue }, `${dossier.date}   ${dossier.heure}`),
        dossier.reglement ? h(View, null, h(Text, { style: s.infoLabel }, "R\u00C8GLEMENT"), h(Text, { style: s.infoValue }, dossier.reglement)) : null)),
    // Table
    h(View, { style: s.tableWrap },
      h(View, { style: s.tableHead },
        h(Text, { style: [s.th, { width: W.des }] }, "D\u00C9SIGNATION"),
        h(Text, { style: [s.th, { width: W.met }] }, "M\u00C9TAL"),
        h(Text, { style: [s.th, { width: W.tit }] }, "TITRAGE"),
        h(Text, { style: [s.th, { width: W.poi, textAlign: "right" }] }, "POIDS"),
        h(Text, { style: [s.th, { width: W.qte, textAlign: "center" }] }, "QT\u00C9"),
        h(Text, { style: [s.th, { width: W.tax, textAlign: "center" }] }, "TAXE"),
        h(Text, { style: [s.th, { width: W.pu, textAlign: "right" }] }, "P.U BRUT"),
        h(Text, { style: [s.th, { width: W.pt, textAlign: "right" }] }, "P.T BRUT")),
      ...references.map((r, i) =>
        h(View, { key: i, style: s.tableRow },
          h(Text, { style: [s.tdBold, { width: W.des }] }, r.designation),
          h(Text, { style: [s.td, { width: W.met }] }, r.metal),
          h(Text, { style: [s.td, { width: W.tit }] }, r.titrage && r.titrage !== "—" ? r.titrage : ""),
          h(Text, { style: [s.td, { width: W.poi, textAlign: "right" }] }, `${r.poids}g`),
          h(Text, { style: [s.td, { width: W.qte, textAlign: "center" }] }, String(r.quantite)),
          h(Text, { style: [s.td, { width: W.tax, textAlign: "center" }] }, r.taxe),
          h(Text, { style: [s.tdBold, { width: W.pu, textAlign: "right" }] }, fmt(r.prixUnitaire)),
          h(Text, { style: [s.tdBold, { width: W.pt, textAlign: "right" }] }, fmt(r.prixTotal))))),
    // Bottom 2 columns
    h(View, { style: s.bottom },
      h(View, { style: s.bottomLeft },
        h(Text, { style: s.sectionLabel }, "R\u00C9CAPITULATIF"),
        h(Text, { style: s.recapText }, recap),
        h(Text, { style: s.sectionLabel }, "CONDITIONS"),
        h(Text, { style: s.condText }, TEXTE_CONDITIONS_ACHAT)),
      h(View, { style: s.bottomRight },
        h(View, { style: s.totGoldLine }),
        h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, "Subtotal"), h(Text, { style: s.totValue }, fmt(totaux.totalBrut))),
        h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, totaux.taxeLabel ?? "Taxe (TMP+CRDS)"), h(Text, { style: s.totValue }, fmt(totaux.taxe))),
        h(View, { style: s.totSep }),
        h(View, { style: s.netRow }, h(Text, { style: s.netLabel }, "NET \u00C0 PAYER"), h(Text, { style: s.netValue }, fmt(totaux.netAPayer))),
        h(View, { style: s.sigBlock }, h(Text, { style: s.sigLabel }, "Signature du vendeur"), h(View, { style: s.sigLine })))),
    // Footer
    h(View, { style: s.footer, fixed: true },
      h(Text, { style: s.footerText }, `${SOCIETE.nom}  \u00B7  ${SOCIETE.details}`),
      h(Text, { style: s.footerText }, `${SOCIETE.adresse}  \u00B7  ${SOCIETE.telephone}`))));
}

export async function generateQuittanceRachat(data: QuittanceRachatData): Promise<Blob> {
  return await pdf(React.createElement(Doc, { data }) as React.ReactElement<never>).toBlob();
}
