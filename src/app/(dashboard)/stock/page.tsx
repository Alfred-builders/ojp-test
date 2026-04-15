import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { StockTable } from "@/components/stock/stock-table";
import type { BijouxStock, BijouxStockWithOrigin } from "@/types/bijoux";
import type { UserRole } from "@/types/auth";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(0, parseInt(params.page ?? "0"));
  const size = Math.max(1, parseInt(params.size ?? "20"));
  const from = page * size;
  const to = from + size - 1;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { count }, { data }, { data: originRefs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("bijoux_stock")
      .select("*", { count: "exact", head: true })
      .is("depot_vente_lot_id", null)
      .not("statut", "in", "(a_fondre,fondu)"),
    supabase
      .from("bijoux_stock")
      .select("*")
      .is("depot_vente_lot_id", null)
      .not("statut", "in", "(a_fondre,fondu)")
      .order("date_creation", { ascending: false })
      .range(from, to),
    supabase
      .from("lot_references")
      .select(
        `destination_stock_id,
        lot:lots!inner (
          type,
          dossier:dossiers!inner (
            client:clients!inner (
              civility, first_name, last_name
            )
          )
        )`
      )
      .not("destination_stock_id", "is", null),
  ]);

  const role = (profile?.role ?? "vendeur") as UserRole;

  // Build a lookup map: stock_id -> origin info
  const originMap = new Map<string, { client_name: string; type: string }>();
  for (const ref of originRefs ?? []) {
    if (!ref.destination_stock_id) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lot = ref.lot as any;
    const client = lot?.dossier?.client;
    if (client) {
      originMap.set(ref.destination_stock_id, {
        client_name: `${client.civility} ${client.first_name} ${client.last_name}`,
        type: lot.type,
      });
    }
  }

  const bijoux: BijouxStockWithOrigin[] = ((data ?? []) as BijouxStock[]).map((item) => {
    const origin = originMap.get(item.id);
    return {
      ...item,
      origin_client_name: origin?.client_name ?? null,
      origin_type: origin
        ? origin.type === "depot_vente" ? "depot_vente" : "rachat"
        : null,
    };
  });

  return (
    <PageWrapper title="Bijoux" fullHeight>
      <StockTable data={bijoux} canEdit={role === "proprietaire" || role === "super_admin"} totalItems={count ?? 0} page={page} pageSize={size} />
    </PageWrapper>
  );
}
