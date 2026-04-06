"use client";

import { useRouter } from "next/navigation";
import { Gear, SignOut, UserCircle, Book } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import type { UserRole } from "@/types/auth";

interface SidebarProfileProps {
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  email: string;
  role: UserRole;
}

export function SidebarProfile({ profile, email, role }: SidebarProfileProps) {
  const isOwner = role === "proprietaire" || role === "super_admin";
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
    window.location.href = "/sign-in";
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton className="h-auto py-2 cursor-pointer" />
            }
          >
            <Avatar className="h-8 w-8 shrink-0 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 transition-all">
              <AvatarImage
                src={profile.avatar_url ?? undefined}
                alt={fullName}
              />
              <AvatarFallback className="text-xs group-data-[collapsible=icon]:text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{fullName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => router.push("/profile")}
            >
              <UserCircle size={16} weight="duotone" />
              <span>Mon profil</span>
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem
                onClick={() => router.push("/parametres")}
              >
                <Gear size={16} weight="duotone" />
                <span>Paramètres</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/documentation")}
            >
              <Book size={16} weight="duotone" />
              <span>Documentation</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleLogout}
            >
              <SignOut size={16} weight="duotone" />
              <span>Se déconnecter</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
