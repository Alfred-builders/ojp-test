import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarProfile } from "@/components/dashboard/sidebar-profile";
import { HoverSidebar } from "@/components/dashboard/hover-sidebar";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profileData = profile ?? {
    first_name: user.user_metadata?.first_name ?? null,
    last_name: user.user_metadata?.last_name ?? null,
    avatar_url: null,
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <HoverSidebar collapsible="icon">
        <SidebarHeader className="px-4 py-3 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <img src="/logo-dark.png" alt="L'Or au Juste Prix" className="h-8 w-8 object-contain dark:hidden" />
            <img src="/logo-light.png" alt="L'Or au Juste Prix" className="hidden h-8 w-8 object-contain dark:block" />
            <span className="text-sm font-bold leading-tight">Or au Juste Prix</span>
          </div>
          <img src="/logo-dark.png" alt="L'Or au Juste Prix" className="hidden h-8 w-8 object-contain transition-all duration-200 group-data-[collapsible=icon]:block dark:group-data-[collapsible=icon]:hidden" />
          <img src="/logo-light.png" alt="L'Or au Juste Prix" className="hidden h-8 w-8 object-contain transition-all duration-200 dark:group-data-[collapsible=icon]:block" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
          <SidebarProfile profile={profileData} email={user.email ?? ""} />
        </SidebarFooter>
      </HoverSidebar>
      <SidebarInset className="max-h-svh overflow-hidden">{children}</SidebarInset>
    </SidebarProvider>
  );
}
