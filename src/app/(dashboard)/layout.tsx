import { redirect } from "next/navigation";
import Image from "next/image";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import {
  SidebarProvider,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarProfile } from "@/components/dashboard/sidebar-profile";
import { HoverSidebar } from "@/components/dashboard/hover-sidebar";
import { NotificationProvider } from "@/providers/notification-provider";
import { CommandPalette } from "@/components/dashboard/command-palette";
import type { UserRole } from "@/types/auth";


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
    role: "vendeur" as UserRole,
  };

  const role = (profileData.role ?? "vendeur") as UserRole;

  return (
    <NotificationProvider userId={user.id}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-4 focus:left-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Aller au contenu principal
      </a>
      <SidebarProvider defaultOpen={false}>
        <HoverSidebar collapsible="icon">
          <SidebarHeader className="overflow-hidden px-4 py-3 transition-all duration-200 ease-linear">
            <Image src="/logo-light.png" alt="L'Or au Juste Prix" width={32} height={32} className="h-8 w-8 shrink-0 object-contain transition-all duration-200 ease-linear dark:hidden" />
            <Image src="/logo-dark.png" alt="L'Or au Juste Prix" width={32} height={32} className="hidden h-8 w-8 shrink-0 object-contain transition-all duration-200 ease-linear dark:block" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav role={role} />
          </SidebarContent>
          <SidebarFooter>
            <SidebarProfile profile={profileData} email={user.email ?? ""} role={role} />
          </SidebarFooter>
        </HoverSidebar>
        <SidebarInset id="main-content" className="max-h-svh overflow-hidden">{children}</SidebarInset>
        <CommandPalette />
      </SidebarProvider>
      <Toaster position="bottom-right" richColors closeButton />
    </NotificationProvider>
  );
}
