import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { ConfieAchatTable, type ConfieAchatItem } from "@/components/confie-achat/confie-achat-table";
import type { BijouxStock } from "@/types/bijoux";
import type { UserRole } from "@/types/auth";

export default async function ConfieAchatPage({
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
      .not("depot_vente_lot_id", "is", null),
    supabase
      .from("bijoux_stock")
      .select("*")
      .not("depot_vente_lot_id", "is", null)
      .order("date_creation", { ascending: false })
      .range(from, to),
    supabase
      .from("lot_references")
      .select(
        `destination_stock_id,
        lot:lots!inner (
          id, numero, type, date_finalisation,
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

  // Build a lookup map: stock_id -> deposant info + lot info
  const originMap = new Map<string, { deposant_name: string; lot_numero: string; lot_id: string; date_depot: string | null }>();
  for (const ref of originRefs ?? []) {
    if (!ref.destination_stock_id) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lot = ref.lot as any;
    const client = lot?.dossier?.client;
    if (client) {
      originMap.set(ref.destination_stock_id, {
        deposant_name: `${client.civility} ${client.first_name} ${client.last_name}`,
        lot_numero: lot.numero,
        lot_id: lot.id,
        date_depot: lot.date_finalisation,
      });
    }
  }

  const items: ConfieAchatItem[] = ((data ?? []) as BijouxStock[]).map((item) => {
    const origin = originMap.get(item.id);
    return {
      ...item,
      deposant_name: origin?.deposant_name ?? null,
      deposant_client_id: item.deposant_client_id,
      lot_numero: origin?.lot_numero ?? null,
      lot_id: origin?.lot_id ?? null,
      date_depot: origin?.date_depot ?? item.date_creation,
    };
  });

  return (
    <PageWrapper title="Confié d'achat" fullHeight>
      <ConfieAchatTable data={items} canEdit={role === "proprietaire" || role === "super_admin"} totalItems={count ?? 0} page={page} pageSize={size} />
    </PageWrapper>
  );
}
