import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { UsersManagementPage } from "@/components/utilisateurs/users-management-page";
import { InviteUserButton } from "@/components/utilisateurs/invite-user-button";
import type { UserProfile } from "@/types/auth";

export default async function UtilisateursPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "proprietaire" && callerProfile?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <PageWrapper title="Gestion des utilisateurs" fullHeight headerActions={<InviteUserButton />}>
      <UsersManagementPage
        users={(profiles ?? []) as UserProfile[]}
        currentUserId={user.id}
        currentUserRole={callerProfile?.role as import("@/types/auth").UserRole}
      />
    </PageWrapper>
  );
}
