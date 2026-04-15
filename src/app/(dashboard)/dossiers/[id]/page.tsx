import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getParametres } from "@/lib/parametres";
import { autoProcessExpiredRetractation } from "@/lib/actions/finalize-actions";
import { DossierDetailPage } from "@/components/dossiers/dossier-detail-page";

// Deduplicate across React double-renders in dev mode
const cachedAutoProcess = cache(async (dossierId: string) => {
  await autoProcessExpiredRetractation(dossierId);
});
import type { DossierWithClient } from "@/types/dossier";
import type { Lot } from "@/types/lot";
import type { DocumentWithRefs } from "@/types/document";
import type { Reglement } from "@/types/reglement";
import type { VenteLigne } from "@/types/vente";
import type { LotReference } from "@/types/lot";
import type { BonCommande } from "@/types/bon-commande";

export default async function DossierDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dossier } = await supabase
    .from("dossiers")
    .select("*, client:clients(id, civility, first_name, last_name, email, phone, city, is_valid, address, postal_code)")
    .eq("id", id)
    .single();

  if (!dossier) return notFound();

  // Auto-process expired retractation before rendering (cached to prevent double-execution)
  await cachedAutoProcess(id);

  const { data: lots } = await supabase
    .from("lots")
    .select("*")
    .eq("dossier_id", id)
    .order("created_at", { ascending: false });

  const { data: documents } = await supabase
    .from("documents")
    .select("*, document_references(id, document_id, lot_reference_id)")
    .eq("dossier_id", id)
    .order("created_at", { ascending: false });

  const parametres = await getParametres();

  // Fetch reglements for all lots in this dossier
  const lotIds = (lots ?? []).map((l) => l.id);
  let reglements: Reglement[] = [];
  let venteLignes: VenteLigne[] = [];
  let lotReferences: LotReference[] = [];

  if (lotIds.length > 0) {
    const [regRes, lignesRes, refsRes] = await Promise.all([
      supabase
        .from("reglements")
        .select("*")
        .in("lot_id", lotIds)
        .order("date_reglement", { ascending: true }),
      supabase
        .from("vente_lignes")
        .select("*")
        .in("lot_id", lotIds),
      supabase
        .from("lot_references")
        .select("*")
        .in("lot_id", lotIds),
    ]);
    reglements = (regRes.data ?? []) as Reglement[];
    venteLignes = (lignesRes.data ?? []) as VenteLigne[];
    lotReferences = (refsRes.data ?? []) as LotReference[];
  }

  // Fetch bons de commande linked to vente lignes
  const bdcIds = [...new Set(venteLignes.filter((l) => l.bon_commande_id).map((l) => l.bon_commande_id!))];
  let bonsCommande: BonCommande[] = [];
  if (bdcIds.length > 0) {
    const { data: bdcData } = await supabase
      .from("bons_commande")
      .select("*, fonderie:fonderies(nom)")
      .in("id", bdcIds);
    bonsCommande = (bdcData ?? []) as BonCommande[];
  }

  // Fetch bijoux_stock prix_achat for vente bijoux lines (cost basis)
  const stockIds = [...new Set(venteLignes.filter((l) => l.bijoux_stock_id).map((l) => l.bijoux_stock_id!))];
  let stockCostMap: Record<string, number> = {};
  if (stockIds.length > 0) {
    const { data: stockItems } = await supabase
      .from("bijoux_stock")
      .select("id, prix_achat")
      .in("id", stockIds);
    stockCostMap = Object.fromEntries((stockItems ?? []).map((s) => [s.id, Number(s.prix_achat) || 0]));
  }

  return (
    <DossierDetailPage
      dossier={dossier as DossierWithClient}
      lots={(lots ?? []) as Lot[]}
      parametres={parametres}
      documents={(documents ?? []) as DocumentWithRefs[]}
      reglements={reglements}
      venteLignes={venteLignes}
      lotReferences={lotReferences}
      bonsCommande={bonsCommande}
      stockCostMap={stockCostMap}
    />
  );
}
