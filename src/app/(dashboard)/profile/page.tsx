import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const profileData = profile ?? {
    id: user!.id,
    first_name: user?.user_metadata?.first_name ?? "",
    last_name: user?.user_metadata?.last_name ?? "",
    avatar_url: null,
    created_at: null,
  };

  return (
    <PageWrapper title="Profil">
      <ProfileForm profile={profileData} email={user!.email ?? ""} />
    </PageWrapper>
  );
}
