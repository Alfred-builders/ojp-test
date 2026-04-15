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

  // Fetch or create user preferences
  let { data: preferences } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  if (!preferences) {
    const { data: newPrefs } = await supabase
      .from("user_preferences")
      .insert({ user_id: user!.id })
      .select()
      .single();
    preferences = newPrefs;
  }

  const profileData = {
    id: profile?.id ?? user!.id,
    first_name: profile?.first_name ?? user?.user_metadata?.first_name ?? "",
    last_name: profile?.last_name ?? user?.user_metadata?.last_name ?? "",
    avatar_url: profile?.avatar_url ?? null,
    created_at: profile?.created_at ?? null,
    role: profile?.role ?? "vendeur",
  };

  const preferencesData = preferences ?? {
    id: "",
    user_id: user!.id,
    theme: "system" as const,
    sidebar_default_open: false,
    items_per_page: 20,
    notif_in_app: true,
    notif_email_digest: false,
  };

  return (
    <PageWrapper title="Mon profil" >
      <ProfileForm
        profile={profileData}
        email={user!.email ?? ""}
        preferences={preferencesData}
      />
    </PageWrapper>
  );
}
