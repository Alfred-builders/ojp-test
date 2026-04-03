import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", user!.id)
    .single();

  const firstName =
    profile?.first_name ?? user?.user_metadata?.first_name ?? "utilisateur";

  return (
    <PageWrapper title="Dashboard">
      <h2 className="text-3xl font-bold tracking-tight">
        Bonjour {firstName} !
      </h2>
    </PageWrapper>
  );
}
