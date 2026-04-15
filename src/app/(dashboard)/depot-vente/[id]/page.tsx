import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { autoProcessExpiredRetractation } from "@/lib/actions/finalize-actions";
import { LotDetailPage } from "@/components/lots/lot-detail-page";
import type { LotWithReferences, LotReference } from "@/types/lot";
import type { DocumentRecord } from "@/types/document";
import type { Reglement } from "@/types/reglement";

export default async function DepotVenteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lot } = await supabase
    .from("lots")
    .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name, email, phone, city, is_valid))")
    .eq("id", id)
    .eq("type", "depot_vente")
    .single();

  if (!lot) return notFound();

  await autoProcessExpiredRetractation(lot.dossier_id);

  const { data: references } = await supabase
    .from("lot_references")
    .select("*")
    .eq("lot_id", id)
    .order("created_at", { ascending: true });

  const { data: documents } = await supabase
    .from("documents")
    .select("*, document_references(id, document_id, lot_reference_id)")
    .eq("lot_id", id)
    .order("created_at", { ascending: false });

  const { data: reglements } = await supabase
    .from("reglements")
    .select("*")
    .eq("lot_id", id)
    .order("date_reglement", { ascending: true });

  const lotWithRefs: LotWithReferences & { dossier: typeof lot.dossier } = {
    ...lot,
    references: (references ?? []) as LotReference[],
  };

  return (
    <LotDetailPage
      lot={lotWithRefs}
      orInvestCatalog={[]}
      typeLabel="Dépôt-vente"
      backHref="/depot-vente"
      documents={(documents ?? []) as DocumentRecord[]}
      reglements={(reglements ?? []) as Reglement[]}
    />
  );
}
