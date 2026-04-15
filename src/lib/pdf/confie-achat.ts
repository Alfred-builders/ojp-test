import React from "react";
import { Document, Page, View, Text, pdf, Image } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "./logo";
import { styles as s, W_CONF, fmt } from "./shared-styles";
import {
  TEXTE_CONDITIONS_CONFIE, SOCIETE,
  type ClientInfo, type DossierInfo, type ConfieReferenceLigne, type TotauxInfo,
} from "./blocks";

export interface ConfieAchatData {
  numero: string;
  client: ClientInfo;
  dossier: DossierInfo;
  reference: ConfieReferenceLigne;
  totaux: TotauxInfo;
}

function Doc({ data }: { data: ConfieAchatData }) {
  const { client, dossier, reference, totaux } = data;
  const h = React.createElement;
  const fullName = `${client.civilite} ${client.prenom} ${client.nom}`;

  // Recap poids
  const recap = `${reference.titre}: ${(reference.poids * reference.quantite).toFixed(1)}g`;

  return h(Document, null, h(Page, { size: "A4", style: s.page },
    // Header
    h(View, { style: s.header },
      h(Image, { style: s.logo, src: LOGO_BASE64 }),
      h(View, { style: s.headerRight },
        h(Text, { style: s.companyName }, SOCIETE.nom.toUpperCase()),
        h(Text, { style: s.companyLine }, SOCIETE.adresse),
        h(Text, { style: s.companyLine }, SOCIETE.telephone))),
    // Info section
    h(View, { style: s.infoSection },
      h(View, { style: s.clientBlock },
        h(Text, { style: s.label }, "CLIENT"),
        h(Text, { style: s.clientName }, fullName),
        client.adresse ? h(Text, { style: s.clientLine }, client.adresse) : null,
        (client.codePostal || client.ville)
          ? h(Text, { style: s.clientLine }, [client.codePostal, client.ville].filter(Boolean).join(" "))
          : null,
        client.documentType && client.documentNumber
          ? h(Text, { style: s.clientMuted }, `${client.documentType}: ${client.documentNumber}`)
          : null,
        h(Text, { style: s.clientMuted }, `Dossier: ${dossier.numeroDossier}`)),
      h(View, { style: s.docRight },
        h(Text, { style: s.docTitle }, "CONFIÉ D'ACHAT"),
        h(Text, { style: s.infoLabel }, "NUMÉRO"),
        h(Text, { style: s.infoValue }, data.numero),
        h(Text, { style: s.infoLabel }, "DATE"),
        h(Text, { style: s.infoValue }, `${dossier.date}   ${dossier.heure}`))),
    // Table
    h(View, { style: s.tableWrap },
      h(View, { style: s.tableHead },
        h(Text, { style: [s.th, { width: W_CONF.titre }] }, "TITRE"),
        h(Text, { style: [s.th, { width: W_CONF.des }] }, "DÉSIGNATION"),
        h(Text, { style: [s.th, { width: W_CONF.qte, textAlign: "center" }] }, "QTÉ"),
        h(Text, { style: [s.th, { width: W_CONF.poids, textAlign: "right" }] }, "POIDS (G)"),
        h(Text, { style: [s.th, { width: W_CONF.prixAchat, textAlign: "right" }] }, "PRIX D'ACHAT"),
        h(Text, { style: [s.th, { width: W_CONF.prixVente, textAlign: "right" }] }, "PRIX DE VENTE")),
      h(View, { style: s.tableRow },
        h(Text, { style: [s.tdBold, { width: W_CONF.titre }] }, reference.titre),
        h(Text, { style: [s.td, { width: W_CONF.des }] }, reference.designation),
        h(Text, { style: [s.td, { width: W_CONF.qte, textAlign: "center" }] }, String(reference.quantite)),
        h(Text, { style: [s.td, { width: W_CONF.poids, textAlign: "right" }] }, `${reference.poids}g`),
        h(Text, { style: [s.td, { width: W_CONF.prixAchat, textAlign: "right" }] }, fmt(reference.prixAchat)),
        h(Text, { style: [s.tdBold, { width: W_CONF.prixVente, textAlign: "right" }] }, fmt(reference.prixVente)))),
    // Bottom 2 columns
    h(View, { style: s.bottom },
      h(View, { style: s.bottomLeft },
        h(Text, { style: s.sectionLabel }, "RÉCAPITULATIF POIDS"),
        h(Text, { style: s.recapText }, recap),
        h(Text, { style: s.sectionLabel }, "CONDITIONS GENERALES DU CONFIE"),
        h(Text, { style: s.condText }, TEXTE_CONDITIONS_CONFIE)),
      h(View, { style: s.bottomRight },
        h(View, { style: s.totGoldLine }),
        h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, "TOTAL BRUT"), h(Text, { style: s.totValue }, fmt(totaux.totalBrut))),
        h(View, { style: s.totRow }, h(Text, { style: s.totLabel }, totaux.taxeLabel ? totaux.taxeLabel.toUpperCase() : "TAXE (TMP+CRDS)"), h(Text, { style: s.totValue }, fmt(totaux.taxe))),
        h(View, { style: s.totSep }),
        h(View, { style: s.netRow }, h(Text, { style: s.netLabel }, "NET À PAYER"), h(Text, { style: s.netValue }, fmt(totaux.netAPayer))),
        h(View, { style: s.sigBlock }, h(Text, { style: s.sigLabel }, "Signature du vendeur"), h(View, { style: s.sigLine })))),
    // Footer
    h(View, { style: s.footer, fixed: true },
      h(Text, { style: s.footerText }, `${SOCIETE.nom}  ·  ${SOCIETE.details}`),
      h(Text, { style: s.footerText }, `${SOCIETE.adresse}  ·  ${SOCIETE.telephone}`))));
}

export async function generateConfieAchat(data: ConfieAchatData): Promise<Blob> {
  return await pdf(React.createElement(Doc, { data }) as React.ReactElement<never>).toBlob();
}
