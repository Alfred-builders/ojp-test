import React from "react";
import { Document, Page, View, Text, pdf, Image } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "./logo";
import { styles as s } from "./shared-styles";
import {
  SOCIETE,
  formatCurrency,
  TEXTE_CONDITIONS_BON_COMMANDE,
  type BonCommandeLigne,
  type FonderieInfo,
  type DossierInfo,
} from "./blocks";

export interface BonCommandeData {
  numero: string;
  dossier: DossierInfo;
  fonderie: FonderieInfo;
  lignes: BonCommandeLigne[];
  totalHT: number;
}

function Doc({ data }: { data: BonCommandeData }) {
  const { dossier, fonderie, lignes, totalHT } = data;
  const h = React.createElement;

  return h(Document, null, h(Page, { size: "A4", style: s.page },
    // Header
    h(View, { style: s.header },
      h(Image, { style: s.logo, src: LOGO_BASE64 }),
      h(View, { style: s.headerRight },
        h(Text, { style: s.docTitle }, "BON DE COMMANDE"),
        h(Text, { style: s.infoLabel }, "N°"),
        h(Text, { style: s.infoValue }, data.numero),
        h(Text, { style: s.infoLabel }, "DATE"),
        h(Text, { style: s.infoValue }, dossier.date),
      ),
    ),

    // Info section
    h(View, { style: s.infoSection },
      h(View, { style: s.clientBlock },
        h(Text, { style: s.label }, "FOURNISSEUR"),
        h(Text, { style: s.clientName }, fonderie.nom),
        fonderie.adresse ? h(Text, { style: s.clientLine }, fonderie.adresse) : null,
        fonderie.codePostal && fonderie.ville ? h(Text, { style: s.clientLine }, `${fonderie.codePostal} ${fonderie.ville}`) : null,
        fonderie.telephone ? h(Text, { style: s.clientMuted }, `Tél : ${fonderie.telephone}`) : null,
        fonderie.email ? h(Text, { style: s.clientMuted }, fonderie.email) : null,
      ),
      h(View, { style: s.docRight },
        h(Text, { style: s.infoLabel }, "DOSSIER"),
        h(Text, { style: s.infoValue }, dossier.numeroDossier),
        h(Text, { style: s.infoLabel }, "LOT"),
        h(Text, { style: s.infoValue }, dossier.numeroLot),
      ),
    ),

    // Table
    h(View, { style: s.tableWrap },
      h(View, { style: s.tableHead },
        h(Text, { style: [s.th, { flex: 3 }] }, "DÉSIGNATION"),
        h(Text, { style: [s.th, { flex: 1, textAlign: "center" }] }, "MÉTAL"),
        h(Text, { style: [s.th, { flex: 1, textAlign: "right" }] }, "POIDS"),
        h(Text, { style: [s.th, { flex: 0.7, textAlign: "right" }] }, "QTÉ"),
        h(Text, { style: [s.th, { flex: 1.3, textAlign: "right" }] }, "P.U. HT"),
        h(Text, { style: [s.th, { flex: 1.3, textAlign: "right" }] }, "TOTAL HT"),
      ),
      ...lignes.map((l, i) =>
        h(View, { key: i, style: s.tableRow },
          h(Text, { style: [s.tdBold, { flex: 3 }] }, l.designation),
          h(Text, { style: [s.td, { flex: 1, textAlign: "center" }] }, l.metal),
          h(Text, { style: [s.td, { flex: 1, textAlign: "right" }] }, `${l.poids}g`),
          h(Text, { style: [s.td, { flex: 0.7, textAlign: "right" }] }, String(l.quantite)),
          h(Text, { style: [s.td, { flex: 1.3, textAlign: "right" }] }, formatCurrency(l.prixUnitaire)),
          h(Text, { style: [s.tdBold, { flex: 1.3, textAlign: "right" }] }, formatCurrency(l.total)),
        ),
      ),
    ),

    // Bottom
    h(View, { style: s.bottom },
      h(View, { style: s.bottomLeft },
        h(Text, { style: s.sectionLabel }, "CONDITIONS"),
        h(Text, { style: s.condText }, TEXTE_CONDITIONS_BON_COMMANDE),
      ),
      h(View, { style: s.bottomRight },
        h(View, { style: s.totGoldLine }),
        h(View, { style: s.netRow },
          h(Text, { style: s.netLabel }, "TOTAL HT"),
          h(Text, { style: s.netValue }, formatCurrency(totalHT)),
        ),
      ),
    ),

    // Signature
    h(View, { style: s.sigBlock },
      h(Text, { style: s.sigLabel }, "Signature et cachet"),
      h(View, { style: s.sigLine }),
    ),

    // Footer
    h(View, { style: { ...s.footer, position: "absolute", bottom: 18, left: 45, right: 45 } },
      h(Text, { style: s.footerText }, `${SOCIETE.nom} — ${SOCIETE.details}`),
      h(Text, { style: s.footerText }, data.numero),
    ),
  ));
}

export async function generateBonCommande(data: BonCommandeData): Promise<Blob> {
  return await pdf(React.createElement(Doc, { data }) as React.ReactElement<never>).toBlob();
}
