import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfieAchatDetailPage } from "@/components/confie-achat/confie-achat-detail-page";
import type { BijouxStock, StockOrigin, StockSale } from "@/types/bijoux";
import type { UserRole } from "@/types/auth";

export default async function ConfieAchatDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data }, { data: originRef }, { data: saleLigne }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single(),
      supabase
        .from("bijoux_stock")
        .select("*")
        .eq("id", id)
        .single(),
      // Origin: find the lot_reference that created this stock entry
      supabase
        .from("lot_references")
        .select(
          `id, designation, prix_achat, status,
          lot:lots!inner (
            id, numero, type, status, date_finalisation, created_at,
            dossier:dossiers!inner (
              id, numero,
              client:clients!inner (
                id, civility, first_name, last_name
              )
            )
          )`
        )
        .eq("destination_stock_id", id)
        .maybeSingle(),
      // Sale: find the vente_ligne that sold this stock entry
      supabase
        .from("vente_lignes")
        .select(
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
        )
        .eq("bijoux_stock_id", id)
        .maybeSingle(),
    ]);

  const role = (profile?.role ?? "vendeur") as UserRole;

  if (!data) return notFound();

  const bijou = data as BijouxStock;

  // Normalize origin data
  let origin: StockOrigin | null = null;

  if (originRef) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lot = originRef.lot as any;
    const dossier = lot.dossier;
    const client = dossier.client;
    origin = {
      type: "depot_vente",
      reference: {
        id: originRef.id,
        designation: originRef.designation,
        prix_achat: originRef.prix_achat,
        status: originRef.status,
      },
      lot: {
        id: lot.id,
        numero: lot.numero,
        type: lot.type,
        status: lot.status,
        date_finalisation: lot.date_finalisation,
        created_at: lot.created_at,
      },
      dossier: { id: dossier.id, numero: dossier.numero },
      client: {
        id: client.id,
        civility: client.civility,
        first_name: client.first_name,
        last_name: client.last_name,
      },
    };
  } else if (bijou.depot_vente_lot_id) {
    // Fallback: depot-vente via bijou.depot_vente_lot_id
    const { data: depotLot } = await supabase
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
      .eq("id", bijou.depot_vente_lot_id)
      .single();

    if (depotLot) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dossier = (depotLot as any).dossier;
      const client = dossier.client;
      origin = {
        type: "depot_vente",
        lot: {
          id: depotLot.id,
          numero: depotLot.numero,
          type: depotLot.type,
          status: depotLot.status,
          date_finalisation: depotLot.date_finalisation,
          created_at: depotLot.created_at,
        },
        dossier: { id: dossier.id, numero: dossier.numero },
        client: {
          id: client.id,
          civility: client.civility,
          first_name: client.first_name,
          last_name: client.last_name,
        },
      };
    }
  }

  // Normalize sale data
  let sale: StockSale | null = null;

  if (saleLigne) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lot = saleLigne.lot as any;
    const dossier = lot.dossier;
    const client = dossier.client;
    sale = {
      ligne: {
        id: saleLigne.id,
        prix_total: saleLigne.prix_total,
        is_livre: saleLigne.is_livre,
      },
      lot: {
        id: lot.id,
        numero: lot.numero,
        status: lot.status,
        date_livraison: lot.date_livraison,
        created_at: lot.created_at,
      },
      dossier: { id: dossier.id, numero: dossier.numero },
      client: {
        id: client.id,
        civility: client.civility,
        first_name: client.first_name,
        last_name: client.last_name,
      },
    };
  }

  return (
    <ConfieAchatDetailPage
      bijou={bijou}
      canEdit={role === "proprietaire" || role === "super_admin"}
      origin={origin}
      sale={sale}
    />
  );
}
