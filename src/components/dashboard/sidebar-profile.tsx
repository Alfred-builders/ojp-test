"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton className="h-auto py-2 cursor-pointer" />
            }
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
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem
              onSelect={() => router.push("/profile")}
            >
              <User />
              <span>Mon profil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleLogout}
            >
              <LogOut />
              <span>Se déconnecter</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
