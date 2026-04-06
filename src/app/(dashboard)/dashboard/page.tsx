import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardKpisServer } from "@/components/dashboard/dashboard-kpis-server";
import { DashboardAlertsServer } from "@/components/dashboard/dashboard-alerts-server";
import { DashboardLotsServer } from "@/components/dashboard/dashboard-lots-server";
import { DashboardCommandesServer } from "@/components/dashboard/dashboard-commandes-server";
import { DashboardActivityServer } from "@/components/dashboard/dashboard-activity-server";
import type { UserRole } from "@/types/auth";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, role")
    .eq("id", user!.id)
    .single();

  const role = (profile?.role ?? "vendeur") as UserRole;
  const firstName =
    profile?.first_name ?? user?.user_metadata?.first_name ?? "utilisateur";

  // Fetch business rules for alerts threshold
  const businessRulesRes = await supabase
    .from("settings")
    .select("value")
    .eq("key", "business_rules")
    .single();
  const seuilIdentiteJours =
    (
      businessRulesRes.data?.value as {
        seuil_alerte_identite_jours?: number;
      } | null
    )?.seuil_alerte_identite_jours ?? 30;

  return (
    <PageWrapper title="Dashboard" fullHeight>
      <div className="flex h-full flex-col gap-4 overflow-y-auto overflow-x-hidden">
        <div className="flex shrink-0 items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Bonjour {firstName} !
          </h2>
          <DashboardQuickActions />
        </div>

        <div className="shrink-0">
          <Suspense fallback={<Skeleton className="h-28 w-full rounded-lg" />}>
            <DashboardKpisServer role={role} />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Suspense
            fallback={<Skeleton className="h-full min-h-[200px] rounded-lg" />}
          >
            <DashboardAlertsServer seuilIdentiteJours={seuilIdentiteJours} />
          </Suspense>
          <Suspense
            fallback={<Skeleton className="h-full min-h-[200px] rounded-lg" />}
          >
            <DashboardLotsServer />
          </Suspense>
          <Suspense
            fallback={<Skeleton className="h-full min-h-[200px] rounded-lg" />}
          >
            <DashboardCommandesServer />
          </Suspense>
          <Suspense
            fallback={<Skeleton className="h-full min-h-[200px] rounded-lg" />}
          >
            <DashboardActivityServer />
          </Suspense>
        </div>
      </div>
    </PageWrapper>
  );
}
