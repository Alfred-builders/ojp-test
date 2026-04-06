import React from "react";
import { Document, Page, View, Text, pdf, Image } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "./logo";
import { styles as s, W_CDV, fmt } from "./shared-styles";
import {
  CDV_CLAUSES, SOCIETE,
  type ClientInfo, type DossierInfo, type DepotVenteReferenceLigne,
} from "./blocks";

export interface ContratDepotVenteData {
  numero: string;
  client: ClientInfo;
  dossier: DossierInfo;
  references: DepotVenteReferenceLigne[];
  numeroLot: string;
}

function Doc({ data }: { data: ContratDepotVenteData }) {
  const { client, dossier, references } = data;
  const h = React.createElement;
  const fullName = `${client.civilite} ${client.prenom} ${client.nom}`;
  return h(Document, null,
    // Page 1: Contrat
    h(Page, { size: "A4", style: s.page },
      // Header
      h(View, { style: s.header },
        h(Image, { style: s.logo, src: LOGO_BASE64 }),
        h(View, { style: s.headerRight },
          h(Text, { style: s.cdvTitle }, "CONTRAT DE DÉPÔT-VENTE"),
          h(Text, { style: s.cdvNumero }, `N°${data.numero}`))),

      // Two-column info: DÉPOSANT | DÉPOSITAIRES
      h(View, { style: s.cdvTwoCol },
        // Left: Déposant
        h(View, { style: s.cdvColLeft },
          h(Text, { style: s.cdvColLabel }, "DÉPOSANT"),
          h(Text, { style: s.cdvColName }, fullName),
          client.adresse ? h(Text, { style: s.cdvColLine }, client.adresse) : null,
          (client.codePostal || client.ville)
            ? h(Text, { style: s.cdvColLine }, [client.codePostal, client.ville].filter(Boolean).join(" "))
            : null,
          client.documentType && client.documentNumber
            ? h(Text, { style: s.cdvColLine }, `${client.documentType} : ${client.documentNumber}`)
            : null,
          h(Text, { style: s.cdvColLine }, `N° Lot : ${data.numeroLot}`)),
        // Right: Dépositaires
        h(View, { style: s.cdvColRight },
          h(Text, { style: s.cdvColLabel }, "DÉPOSITAIRES"),
          h(Text, { style: s.cdvColName }, SOCIETE.nom),
          h(Text, { style: s.cdvColLine }, SOCIETE.adresse))),

      // Legal clauses
      ...CDV_CLAUSES.map((clause, i) =>
        h(View, { key: i, wrap: false },
          h(Text, { style: s.cdvClauseTitle }, clause.title),
          h(Text, { style: s.cdvClauseBody }, clause.body))),

      // Signature section
      h(View, { style: s.cdvSignatureSection },
        h(Text, { style: s.cdvSignatureTitle }, "SIGNATURE POUR ACCEPTATION DU PRECEDENT PARAGRAPHE"),
        h(Text, { style: s.cdvSignatureDate }, `Fait en double exemplaire à Saint Julien en Genevois, le ${dossier.date}`),
        h(View, { style: s.cdvSignatureRow },
          h(View, { style: s.cdvSignatureZone },
            h(Text, { style: s.cdvSignatureLabel }, "Le Déposant-Vendeur")),
          h(View, { style: [s.cdvSignatureZone, { alignItems: "flex-end" }] },
            h(Text, { style: s.cdvSignatureLabel }, "Le Dépositaire")))),

      // Footer
      h(View, { style: s.footer, fixed: true },
        h(Text, { style: s.footerText }, `${SOCIETE.nom} - ${SOCIETE.adresse}`),
        h(Text, { style: s.footerText }, `${SOCIETE.details} - ${SOCIETE.siret_rcs}`))),

    // Page 2: Tableau des marchandises
    h(Page, { size: "A4", style: s.page },
      // Table header
      h(View, { style: s.tableWrap },
        h(View, { style: s.tableHead },
          h(Text, { style: [s.th, { width: W_CDV.des }] }, "DÉSIGNATION"),
          h(Text, { style: [s.th, { width: W_CDV.desc }] }, "DESCRIPTION"),
          h(Text, { style: [s.th, { width: W_CDV.prixNet, textAlign: "right" }] }, "PRIX NET (DÉPOSANT)"),
          h(Text, { style: [s.th, { width: W_CDV.prixPublic, textAlign: "right" }] }, "PRIX AFFICHÉ (PUBLIC)")),
        // Table rows
        ...references.map((r, i) =>
          h(View, { key: i, style: s.tableRow },
            h(Text, { style: [s.tdBold, { width: W_CDV.des }] }, r.designation),
            h(Text, { style: [s.td, { width: W_CDV.desc }] }, r.description),
            h(Text, { style: [s.td, { width: W_CDV.prixNet, textAlign: "right" }] }, fmt(r.prixNetDeposant)),
            h(Text, { style: [s.tdBold, { width: W_CDV.prixPublic, textAlign: "right" }] }, fmt(r.prixAffichePublic))))),

      // Footer
      h(View, { style: s.footer, fixed: true },
        h(Text, { style: s.footerText }, `${SOCIETE.nom} - ${SOCIETE.adresse}`),
        h(Text, { style: s.footerText }, `${SOCIETE.details} - ${SOCIETE.siret_rcs}`))));
}

export async function generateContratDepotVente(data: ContratDepotVenteData): Promise<Blob> {
  return await pdf(React.createElement(Doc, { data }) as React.ReactElement<never>).toBlob();
}
