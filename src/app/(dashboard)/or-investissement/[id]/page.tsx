import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrInvestissementDetailPage } from "@/components/or-investissement/or-investissement-detail-page";
import type { OrInvestissement } from "@/types/or-investissement";
import type { UserRole } from "@/types/auth";

export default async function OrInvestissementDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const role = (profile?.role ?? "vendeur") as UserRole;

  const { data } = await supabase
    .from("or_investissement")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return notFound();

  return <OrInvestissementDetailPage item={data as OrInvestissement} canEdit={role === "proprietaire" || role === "super_admin"} />;
}
