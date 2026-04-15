import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { autoProcessExpiredRetractation } from "@/lib/actions/finalize-actions";
import { LotDetailPage } from "@/components/lots/lot-detail-page";

const cachedAutoProcess = cache(async (dossierId: string) => {
  await autoProcessExpiredRetractation(dossierId);
});
import type { LotWithReferences, LotReference } from "@/types/lot";
import type { DocumentRecord } from "@/types/document";
import type { Reglement } from "@/types/reglement";

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lot } = await supabase
    .from("lots")
    .select("*, dossier:dossiers(id, numero, client:clients(id, civility, first_name, last_name, email, phone, city, is_valid))")
    .eq("id", id)
    .single();

  if (!lot) return notFound();

  // Auto-process expired retractation before rendering (cached to prevent double-execution)
  await cachedAutoProcess(lot.dossier_id);

  const { data: references } = await supabase
    .from("lot_references")
    .select("*")
    .eq("lot_id", id)
    .order("created_at", { ascending: true });

  // Fetch or_investissement catalog for the form
  const { data: orInvestCatalog } = await supabase
    .from("or_investissement")
    .select("*")
    .order("designation", { ascending: true });

  // Fetch documents for this lot
  const { data: documents } = await supabase
    .from("documents")
    .select("*, document_references(id, document_id, lot_reference_id)")
    .eq("lot_id", id)
    .order("created_at", { ascending: false });

  // Fetch reglements for this lot
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
      orInvestCatalog={orInvestCatalog ?? []}
      documents={(documents ?? []) as DocumentRecord[]}
      reglements={(reglements ?? []) as Reglement[]}
    />
  );
}
