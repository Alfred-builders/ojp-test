import { createClient } from "@/lib/supabase/server";
import { DOSSIER_WITH_CLIENT } from "@/lib/supabase/queries";
import { DashboardAlerts } from "@/components/dashboard/dashboard-alerts";
import type {
  RetractationAlert,
  DevisAlert,
  ReferenceAlert,
  DocumentAlert,
  PaiementAlert,
} from "@/components/dashboard/dashboard-alerts";
import { safe, clientName, extractDossier, extractClient } from "@/components/dashboard/dashboard-helpers";

const RETRACTATION_DELAY_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function DashboardAlertsServer({
  seuilIdentiteJours,
}: {
  seuilIdentiteJours: number;
}) {
  const supabase = await createClient();

  const now = new Date();
  const in30d = new Date(now.getTime() + seuilIdentiteJours * 24 * 60 * 60 * 1000).toISOString();

  const [
    retractationsRes,
    devisRes,
    refAlertsRes,
    expiringDocsRes,
    ventePaiementsRes,
    rachatPaiementsRes,
  ] = await Promise.all([
    // Alertes: Retractations
    safe(supabase
      .from("lots")
      .select(
        `id, numero, status, date_fin_retractation, ${DOSSIER_WITH_CLIENT}`,
      )
      .eq("status", "en_retractation")
      .order("date_fin_retractation", { ascending: true })),
    // Alertes: Devis en attente
    safe(supabase
      .from("lots")
      .select(
        `id, numero, status, created_at, ${DOSSIER_WITH_CLIENT}`,
      )
      .eq("status", "devis_envoye")
      .order("created_at", { ascending: true })),
    // Alertes: References avec delai (retractation / devis)
    safe(supabase
      .from("lot_references")
      .select(
        `id, designation, status, date_fin_delai, lot:lots(id, numero, ${DOSSIER_WITH_CLIENT})`,
      )
      .in("status", ["en_retractation", "devis_envoye"])
      .not("date_fin_delai", "is", null)
      .order("date_fin_delai", { ascending: true })),
    // Alertes: Pieces d'identite expirant
    safe(supabase
      .from("client_identity_documents")
      .select(
        "id, client_id, document_type, expiry_date, client:clients(id, civility, first_name, last_name)",
      )
      .eq("is_primary", true)
      .lte("expiry_date", in30d)
      .gte("expiry_date", now.toISOString())
      .order("expiry_date", { ascending: true })),
    // Paiements: Lots vente en_cours avec acompte non paye
    safe(supabase
      .from("lots")
      .select(`id, numero, type, status, created_at, acompte_montant, acompte_paye, solde_paye, date_limite_solde, mode_reglement, montant_net, total_prix_revente, montant_taxe, ${DOSSIER_WITH_CLIENT}`)
      .eq("type", "vente")
      .in("status", ["en_cours"])
      .order("created_at", { ascending: false })),
    // Paiements: Lots rachat finalises sans mode_reglement
    safe(supabase
      .from("lots")
      .select(`id, numero, type, status, montant_net, mode_reglement, ${DOSSIER_WITH_CLIENT}`)
      .eq("type", "rachat")
      .eq("status", "finalise")
      .is("mode_reglement", null)
      .order("created_at", { ascending: false })),
  ]);

  // --- Transform data ---

  // Alertes: Retractations
  const retractations: RetractationAlert[] = (retractationsRes.data ?? []).map(
    (lot) => {
      const dossier = extractDossier(lot.dossier);
      return {
        id: lot.id,
        numero: lot.numero,
        dateFin: lot.date_fin_retractation ?? "",
        clientName: clientName(dossier?.client ?? null),
        dossierId: dossier?.id ?? "",
      };
    },
  );

  // Alertes: Devis
  const devisEnAttente: DevisAlert[] = (devisRes.data ?? []).map((lot) => {
    const dossier = extractDossier(lot.dossier);
    return {
      id: lot.id,
      numero: lot.numero,
      createdAt: lot.created_at,
      clientName: clientName(dossier?.client ?? null),
      dossierId: dossier?.id ?? "",
    };
  });

  // Alertes: References avec delai
  const referenceAlerts: ReferenceAlert[] = (refAlertsRes.data ?? []).map(
    (ref) => {
      const lot = extractDossier(ref.lot) as unknown as {
        id: string;
        numero: string;
        dossier: unknown;
      } | null;
      const dossier = lot ? extractDossier(lot.dossier) : null;
      return {
        id: ref.id,
        designation: ref.designation,
        status: ref.status,
        dateFin: ref.date_fin_delai ?? "",
        lotId: lot?.id ?? "",
        lotNumero: lot?.numero ?? "",
        clientName: clientName(dossier?.client ?? null),
      };
    },
  );

  // Alertes: Documents expirant
  const expiringDocuments: DocumentAlert[] = (expiringDocsRes.data ?? []).map(
    (doc) => {
      const client = extractClient(doc.client);
      return {
        clientId: doc.client_id,
        clientName: clientName(client),
        documentType: doc.document_type,
        expiryDate: doc.expiry_date,
      };
    },
  );

  // Alertes: Paiements en attente
  const paiements: PaiementAlert[] = [];

  // Batch-fetch all reglements for vente lots (avoids N+1)
  const venteLotIdsForReglements = (ventePaiementsRes.data ?? []).map((l) => l.id);
  const { data: allReglements } = venteLotIdsForReglements.length > 0
    ? await supabase
        .from("reglements")
        .select("lot_id, type, montant, date_reglement")
        .in("lot_id", venteLotIdsForReglements)
        .order("date_reglement", { ascending: true })
    : { data: [] as { lot_id: string; type: string; montant: number; date_reglement: string }[] };

  // Group reglements by lot_id
  const reglementsByLotId = new Map<string, typeof allReglements>();
  for (const r of allReglements ?? []) {
    const arr = reglementsByLotId.get(r.lot_id) ?? [];
    arr.push(r);
    reglementsByLotId.set(r.lot_id, arr);
  }

  // Vente lots: check acompte and solde
  for (const lot of ventePaiementsRes.data ?? []) {
    const dossier = extractDossier(lot.dossier);
    const cn = clientName(dossier?.client ?? null);

    const lotReglements = reglementsByLotId.get(lot.id) ?? [];

    const acomptePaid = lotReglements.filter((r) => r.type === "acompte").reduce((s, r) => s + Number(r.montant), 0);
    const soldePaid = lotReglements.filter((r) => r.type === "solde").reduce((s, r) => s + Number(r.montant), 0);
    const ventePaid = lotReglements.filter((r) => r.type === "vente").reduce((s, r) => s + Number(r.montant), 0);

    // Compute 48h deadline from acompte payment date if not set on lot
    let dateLimiteSolde = lot.date_limite_solde;
    if (!dateLimiteSolde && acomptePaid > 0) {
      const lastAcompte = lotReglements.filter((r) => r.type === "acompte").at(-1);
      if (lastAcompte?.date_reglement) {
        dateLimiteSolde = new Date(new Date(lastAcompte.date_reglement).getTime() + RETRACTATION_DELAY_MS).toISOString();
      }
    }

    if (lot.acompte_montant && acomptePaid < lot.acompte_montant) {
      paiements.push({
        lotId: lot.id,
        lotNumero: lot.numero,
        clientName: cn,
        type: "acompte",
        lotType: "vente",
        montant: lot.acompte_montant - acomptePaid,
        dateLimite: dateLimiteSolde,
        createdAt: lot.created_at,
      });
    }

    if (lot.acompte_montant && acomptePaid >= lot.acompte_montant && !lot.solde_paye) {
      const totalTTC = (lot.total_prix_revente ?? 0) + (lot.montant_taxe ?? 0);
      const soldeExpected = totalTTC - lot.acompte_montant;
      if (soldePaid < soldeExpected) {
        paiements.push({
          lotId: lot.id,
          lotNumero: lot.numero,
          clientName: cn,
          type: "solde",
          lotType: "vente",
          montant: soldeExpected - soldePaid,
          dateLimite: lot.date_limite_solde,
          createdAt: lot.created_at,
        });
      }
    }

    // Vente without full payment (bijoux or general)
    if (!lot.acompte_montant) {
      const totalTTC = (lot.total_prix_revente ?? 0) + (lot.montant_taxe ?? 0);
      const totalPaid = ventePaid + acomptePaid + soldePaid;
      if (totalTTC > 0 && totalPaid < totalTTC) {
        // If some payment exists, it's a "solde" ; otherwise it's the full "vente"
        const hasPartialPayment = totalPaid > 0;
        paiements.push({
          lotId: lot.id,
          lotNumero: lot.numero,
          clientName: cn,
          type: hasPartialPayment ? "solde" : "vente",
          lotType: "vente",
          montant: totalTTC - totalPaid,
          dateLimite: dateLimiteSolde ?? null,
          createdAt: lot.created_at,
        });
      }
    }
  }

  // Rachat lots without payment recorded
  for (const lot of rachatPaiementsRes.data ?? []) {
    const dossier = extractDossier(lot.dossier);
    paiements.push({
      lotId: lot.id,
      lotNumero: lot.numero,
      clientName: clientName(dossier?.client ?? null),
      type: "rachat",
      lotType: "rachat",
      montant: lot.montant_net ?? 0,
      dateLimite: null,
    });
  }

  return (
    <DashboardAlerts
      retractations={retractations}
      devisEnAttente={devisEnAttente}
      referenceAlerts={referenceAlerts}
      expiringDocuments={expiringDocuments}
      paiements={paiements}
    />
  );
}
