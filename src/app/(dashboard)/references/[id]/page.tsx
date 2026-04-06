import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReferenceDetailPage } from "@/components/references/reference-detail-page";
import type { LotReference } from "@/types/lot";

export default async function ReferenceDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Step 1: Fetch the reference
  const { data: refData } = await supabase
    .from("lot_references")
    .select("*")
    .eq("id", id)
    .single();

  if (!refData) return notFound();

  const reference = refData as LotReference;

  // Step 2: Fetch parent lot with dossier + client
  const { data: lotData } = await supabase
    .from("lots")
    .select(
      `id, numero, type, status, date_finalisation, created_at,
      dossier:dossiers!inner (
        id, numero,
        client:clients!inner (
          id, civility, first_name, last_name
        )
      )`
    )
    .eq("id", reference.lot_id)
    .single();

  if (!lotData) return notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dossierRaw = (lotData as any).dossier;
  const clientRaw = dossierRaw.client;

  const parentLot = {
    id: lotData.id,
    numero: lotData.numero,
    type: lotData.type,
    status: lotData.status,
    date_finalisation: lotData.date_finalisation,
    created_at: lotData.created_at,
  };

  const dossier = { id: dossierRaw.id, numero: dossierRaw.numero };
  const client = {
    id: clientRaw.id,
    civility: clientRaw.civility,
    first_name: clientRaw.first_name,
    last_name: clientRaw.last_name,
  };

  // Step 3: Conditional queries
  let stockItem = null;
  let sale = null;
  let orInvestissement = null;

  // Parallel conditional queries
  const [stockRes, saleRes, orInvestRes] = await Promise.all([
    reference.destination_stock_id
      ? supabase.from("bijoux_stock").select("id, nom, statut").eq("id", reference.destination_stock_id).single()
      : Promise.resolve({ data: null }),
    reference.destination_stock_id
      ? supabase.from("vente_lignes").select(
          `id, prix_total, is_livre,
          lot:lots!inner (
            id, numero, status, date_livraison, created_at,
            dossier:dossiers!inner (
              id, numero,
              client:clients!inner (
                id, civility, first_name, last_name
              )
            )
          )`
        ).eq("bijoux_stock_id", reference.destination_stock_id).maybeSingle()
      : Promise.resolve({ data: null }),
    reference.or_investissement_id
      ? supabase.from("or_investissement").select("id, designation, poids, qualite").eq("id", reference.or_investissement_id).single()
      : Promise.resolve({ data: null }),
  ]);

  stockItem = stockRes.data;
  orInvestissement = orInvestRes.data;

  if (saleRes.data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sl = saleRes.data as any;
    const saleLot = sl.lot;
    const saleDossier = saleLot.dossier;
    const saleClient = saleDossier.client;
    sale = {
      ligne: { id: sl.id, prix_total: sl.prix_total, is_livre: sl.is_livre },
      lot: {
        id: saleLot.id,
        numero: saleLot.numero,
        status: saleLot.status,
        date_livraison: saleLot.date_livraison,
        created_at: saleLot.created_at,
      },
      dossier: { id: saleDossier.id, numero: saleDossier.numero },
      client: {
        id: saleClient.id,
        civility: saleClient.civility,
        first_name: saleClient.first_name,
        last_name: saleClient.last_name,
      },
    };
  }

  return (
    <ReferenceDetailPage
      reference={reference}
      parentLot={parentLot}
      dossier={dossier}
      client={client}
      stockItem={stockItem}
      sale={sale}
      orInvestissement={orInvestissement}
    />
  );
}
