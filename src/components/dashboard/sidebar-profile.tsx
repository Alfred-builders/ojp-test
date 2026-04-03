"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface SidebarProfileProps {
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  email: string;
}

export function SidebarProfile({ profile, email }: SidebarProfileProps) {
  const router = useRouter();

  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Utilisateur";
  const initials =
    [profile.first_name?.[0], profile.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "U";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="h-auto py-2"
          render={<Link href="/profile" />}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage
              src={profile.avatar_url ?? undefined}
              alt={fullName}
            />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{fullName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {email}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={handleLogout}>
          <LogOut />
          <span>Déconnexion</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
