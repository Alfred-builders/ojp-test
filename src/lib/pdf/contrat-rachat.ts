import React from "react";
import { Document, Page, View, Text, pdf, Image } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "./logo";
import { styles as s, W, fmt } from "./shared-styles";
import { TEXTE_CONDITIONS_CONTRAT, SOCIETE, type ClientInfo, type DossierInfo, type ReferenceLigne, type TotauxInfo } from "./blocks";

export interface ContratRachatData {
  numero: string;
  client: ClientInfo;
  dossier: DossierInfo;
  references: ReferenceLigne[];
  totaux: TotauxInfo;
}

function Doc({ data }: { data: ContratRachatData }) {
  const { client, dossier, references, totaux } = data;
  const h = React.createElement;
  const fullName = `${client.civilite} ${client.prenom} ${client.nom}`;

  return h(Document, null,
    // Page 1: Contrat
    h(Page, { size: "A4", style: s.page },
      h(View, { style: s.header },
        h(Image, { style: s.logo, src: LOGO_BASE64 }),
        h(View, { style: s.headerRight },
          h(Text, { style: s.companyName }, SOCIETE.nom.toUpperCase()),
          h(Text, { style: s.companyLine }, SOCIETE.adresse),
          h(Text, { style: s.companyLine }, SOCIETE.telephone))),
      h(View, { style: s.infoSection },
        h(View, { style: s.clientBlock },
          h(Text, { style: s.label }, "CLIENT"),
          h(Text, { style: s.clientName }, fullName),
          client.adresse ? h(Text, { style: s.clientLine }, client.adresse) : null,
          (client.codePostal || client.ville) ? h(Text, { style: s.clientLine }, [client.codePostal, client.ville].filter(Boolean).join(" ")) : null,
          client.documentType && client.documentNumber ? h(Text, { style: s.clientMuted }, `${client.documentType} : ${client.documentNumber}`) : null,
          h(Text, { style: s.clientMuted }, `Dossier : ${dossier.numeroDossier}`)),
        h(View, { style: s.docRight },
          h(Text, { style: s.docTitle }, "CONTRAT"),
          h(Text, { style: s.infoLabel }, "NUM\u00C9RO"),
          h(Text, { style: s.infoValue }, data.numero),
          h(Text, { style: s.infoLabel }, "DATE"),
          h(Text, { style: s.infoValue }, `${dossier.date}   ${dossier.heure}`))),
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
      // Totaux + signature
      h(View, { style: { alignItems: "flex-end", marginTop: 8 } },
        h(View, { style: { width: 200 } },
          h(View, { style: s.totGoldLine }),
          h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, "Subtotal"), h(Text, { style: s.totValue }, fmt(totaux.totalBrut))),
          h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, totaux.taxeLabel ?? "Taxe (TMP+CRDS)"), h(Text, { style: s.totValue }, fmt(totaux.taxe))),
          h(View, { style: s.totSep }),
          h(View, { style: s.netRow }, h(Text, { style: s.netLabel }, "NET \u00C0 PAYER"), h(Text, { style: s.netValue }, fmt(totaux.netAPayer))),
          h(View, { style: s.sigBlock }, h(Text, { style: s.sigLabel }, "Signature du vendeur"), h(View, { style: s.sigLine })))),
      // Conditions du contrat
      h(View, { style: s.condBlock },
        h(Text, { style: s.condTitle }, "CONDITIONS G\u00C9N\u00C9RALES DU CONTRAT"),
        h(Text, { style: s.condBody }, TEXTE_CONDITIONS_CONTRAT)),
      h(View, { style: s.footer, fixed: true },
        h(Text, { style: s.footerText }, `${SOCIETE.nom}  \u00B7  ${SOCIETE.details}`),
        h(Text, { style: s.footerText }, `${SOCIETE.adresse}  \u00B7  ${SOCIETE.telephone}`))),

    // Page 2: Bordereau de rétractation
    h(Page, { size: "A4", style: s.page },
      h(View, { style: s.bordereauCut }),
      h(Text, { style: s.bordereauTitle }, "BORDEREAU DE R\u00C9TRACTATION\n(Article L. 224-99 du Code de la consommation)"),
      h(Text, { style: s.bordereauIntro },
        "Conform\u00E9ment \u00E0 mon droit de r\u00E9tractation de 48H apr\u00E8s signature du contrat, je vous notifie par ce bordereau que j'exerce mon droit de r\u00E9tractation et que j'annule le contrat :"),
      h(View, { style: { marginBottom: 16 } },
        ...[
          { label: "N\u00B0 de Contrat :", value: data.numero },
          { label: "Date du contrat :", value: dossier.date },
          { label: "Nom du client :", value: fullName },
          { label: "Vendeur :", value: SOCIETE.nom },
        ].map((f, i) =>
          h(View, { key: i, style: s.bordereauFieldRow },
            h(Text, { style: s.bordereauFieldLabel }, f.label),
            h(Text, { style: s.bordereauFieldValue }, f.value)))),
      h(View, { style: [s.spaceBetween, s.mt8] },
        h(View, null,
          h(Text, { style: [s.td, s.mb4] }, "Fait le : ..... / ..... / .........."),
          h(Text, { style: s.td }, "\u00E0 : ..... h .....")),
        h(View, { style: { alignItems: "flex-end" } },
          h(Text, { style: s.sigLabel }, "Signature du client :"),
          h(View, { style: { borderBottomWidth: 0.5, borderBottomColor: "#1A1A1A", width: 150, marginTop: 25 } }))),
      h(View, { style: s.footer, fixed: true },
        h(Text, { style: s.footerText }, `${SOCIETE.nom}  \u00B7  ${SOCIETE.details}`),
        h(Text, { style: s.footerText }, `${SOCIETE.adresse}  \u00B7  ${SOCIETE.telephone}`))));
}

export async function generateContratRachat(data: ContratRachatData): Promise<Blob> {
  return await pdf(React.createElement(Doc, { data }) as React.ReactElement<never>).toBlob();
}
