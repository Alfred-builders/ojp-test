import React from "react";
import { Document, Page, View, Text, pdf, Image } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "./logo";
import { styles as s, C } from "./shared-styles";
import {
  SOCIETE,
  formatCurrency,
  TEXTE_CONDITIONS_BON_LIVRAISON,
  type BonLivraisonGroupData,
  type FonderieInfo,
} from "./blocks";

export interface BonLivraisonData {
  numero: string;
  date: string;
  fonderie: FonderieInfo;
  groupes: BonLivraisonGroupData[];
  poidsTotal: number;
  valeurEstimee: number;
}

function Doc({ data }: { data: BonLivraisonData }) {
  const { fonderie, groupes, poidsTotal, valeurEstimee } = data;
  const h = React.createElement;

  return h(Document, null, h(Page, { size: "A4", style: s.page },
    // Header
    h(View, { style: s.header },
      h(Image, { style: s.logo, src: LOGO_BASE64 }),
      h(View, { style: s.headerRight },
        h(Text, { style: s.docTitle }, "BON DE LIVRAISON"),
        h(Text, { style: s.infoLabel }, "N°"),
        h(Text, { style: s.infoValue }, data.numero),
        h(Text, { style: s.infoLabel }, "DATE"),
        h(Text, { style: s.infoValue }, data.date),
      ),
    ),

    // Info section
    h(View, { style: s.infoSection },
      h(View, { style: s.clientBlock },
        h(Text, { style: s.label }, "DESTINATAIRE"),
        h(Text, { style: s.clientName }, fonderie.nom),
        fonderie.adresse ? h(Text, { style: s.clientLine }, fonderie.adresse) : null,
        fonderie.codePostal && fonderie.ville ? h(Text, { style: s.clientLine }, `${fonderie.codePostal} ${fonderie.ville}`) : null,
        fonderie.telephone ? h(Text, { style: s.clientMuted }, `Tél : ${fonderie.telephone}`) : null,
        fonderie.email ? h(Text, { style: s.clientMuted }, fonderie.email) : null,
      ),
      h(View, { style: s.docRight },
        h(Text, { style: s.infoLabel }, "EXPÉDITEUR"),
        h(Text, { style: { fontSize: 8, color: C.text, textAlign: "right" as const, marginBottom: 2 } }, SOCIETE.nom),
        h(Text, { style: { fontSize: 7, color: C.gray, textAlign: "right" as const } }, SOCIETE.adresse),
        h(Text, { style: { fontSize: 7, color: C.gray, textAlign: "right" as const } }, `Tél : ${SOCIETE.telephone}`),
      ),
    ),

    // Table grouped by metal/titrage
    h(View, { style: s.tableWrap },
      // Column headers
      h(View, { style: s.tableHead },
        h(Text, { style: [s.th, { width: "34%" }] }, "DÉSIGNATION"),
        h(Text, { style: [s.th, { width: "14%", textAlign: "right" }] }, "POIDS"),
        h(Text, { style: [s.th, { width: "18%", textAlign: "right" }] }, "COURS/g"),
        h(Text, { style: [s.th, { width: "18%", textAlign: "right" }] }, "VALEUR"),
      ),

      // Groups
      ...groupes.map((group, gi) => h(View, { key: gi },
        // Group header
        h(View, { style: { flexDirection: "row" as const, backgroundColor: "#F5F0E6", paddingVertical: 4, paddingHorizontal: 6, marginTop: gi > 0 ? 8 : 4 } },
          h(Text, { style: { fontSize: 7, fontFamily: "Courier-Bold", color: C.gold } },
            `${group.metal} ${group.titrage}`,
          ),
        ),
        // Lines in group
        ...group.lignes.map((l, li) =>
          h(View, { key: li, style: s.tableRow },
            h(Text, { style: [s.tdBold, { width: "34%" }] }, l.designation),
            h(Text, { style: [s.td, { width: "14%", textAlign: "right" }] }, `${l.poids.toFixed(2)}g`),
            h(Text, { style: [s.td, { width: "18%", textAlign: "right" }] }, formatCurrency(l.cours)),
            h(Text, { style: [s.tdBold, { width: "18%", textAlign: "right" }] }, formatCurrency(l.valeur)),
          ),
        ),
        // Subtotal
        h(View, { style: { flexDirection: "row" as const, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.line } },
          h(Text, { style: [{ fontSize: 7, fontFamily: "Courier-Bold", color: C.gray }, { width: "34%" }] },
            `Sous-total : ${group.sousTotal.pieces} pce${group.sousTotal.pieces > 1 ? "s" : ""}`,
          ),
          h(Text, { style: [{ fontSize: 7, fontFamily: "Courier-Bold", color: C.text, textAlign: "right" as const }, { width: "14%" }] },
            `${group.sousTotal.poids.toFixed(2)}g`,
          ),
          h(Text, { style: { width: "18%" } }, ""),
          h(Text, { style: [{ fontSize: 7, fontFamily: "Courier-Bold", color: C.text, textAlign: "right" as const }, { width: "18%" }] },
            formatCurrency(group.sousTotal.valeur),
          ),
        ),
      )),
    ),

    // Bottom
    h(View, { style: s.bottom },
      h(View, { style: s.bottomLeft },
        h(Text, { style: s.sectionLabel }, "CONDITIONS"),
        h(Text, { style: s.condText }, TEXTE_CONDITIONS_BON_LIVRAISON),
      ),
      h(View, { style: s.bottomRight },
        h(View, { style: s.totGoldLine }),
        h(View, { style: s.totRow },
          h(Text, { style: s.totLabel }, "POIDS TOTAL"),
          h(Text, { style: s.totValue }, `${poidsTotal.toFixed(2)}g`),
        ),
        h(View, { style: s.totSep }),
        h(View, { style: s.netRow },
          h(Text, { style: s.netLabel }, "VALEUR ESTIMÉE"),
          h(Text, { style: s.netValue }, formatCurrency(valeurEstimee)),
        ),
      ),
    ),

    // Signature (two zones)
    h(View, { style: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 20 } },
      h(View, { style: { width: "40%" } },
        h(Text, { style: s.sigLabel }, "Le remettant"),
        h(View, { style: s.sigLine }),
      ),
      h(View, { style: { width: "40%", alignItems: "flex-end" as const } },
        h(Text, { style: s.sigLabel }, "Le destinataire (fonderie)"),
        h(View, { style: s.sigLine }),
      ),
    ),

    // Footer
    h(View, { style: { ...s.footer, position: "absolute" as const, bottom: 18, left: 45, right: 45 } },
      h(Text, { style: s.footerText }, `${SOCIETE.nom} — ${SOCIETE.details}`),
      h(Text, { style: s.footerText }, data.numero),
    ),
  ));
}

export async function generateBonLivraison(data: BonLivraisonData): Promise<Blob> {
  return await pdf(React.createElement(Doc, { data }) as React.ReactElement<never>).toBlob();
}
