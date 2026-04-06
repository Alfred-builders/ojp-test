"use client";

import { useState } from "react";
import {
  UserCircle,
  ShieldCheck,
  PaintBrush,
  Bell,
  Keyboard,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ProfileInfoSection } from "@/components/profile/profile-info-section";
import { ProfileSecuritySection } from "@/components/profile/profile-security-section";
import { ProfileAppearanceSection } from "@/components/profile/profile-appearance-section";
import { ProfileNotificationsSection } from "@/components/profile/profile-notifications-section";
import { ProfileShortcutsSection } from "@/components/profile/profile-shortcuts-section";
import type { UserRole } from "@/types/auth";
import type { UserPreferences } from "@/types/preferences";

interface ProfileFormProps {
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    created_at: string | null;
    role: UserRole;
  };
  email: string;
  preferences: UserPreferences;
}

type Section = "info" | "securite" | "apparence" | "notifications" | "raccourcis";

const NAV_ITEMS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "info", label: "Informations", icon: <UserCircle size={16} weight="duotone" /> },
  { key: "securite", label: "Securite", icon: <ShieldCheck size={16} weight="duotone" /> },
  { key: "apparence", label: "Apparence", icon: <PaintBrush size={16} weight="duotone" /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={16} weight="duotone" /> },
  { key: "raccourcis", label: "Raccourcis", icon: <Keyboard size={16} weight="duotone" /> },
];

export function ProfileForm({ profile, email, preferences }: ProfileFormProps) {
  const [activeSection, setActiveSection] = useState<Section>("info");

  return (
    <div className="flex flex-1 min-h-0 -m-6">
      {/* Navigation laterale */}
      <nav className="w-52 shrink-0 border-r overflow-y-auto py-6 pl-6 pr-2">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveSection(item.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left",
                activeSection === item.key
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          {activeSection === "info" && (
            <ProfileInfoSection profile={profile} email={email} />
          )}
          {activeSection === "securite" && <ProfileSecuritySection />}
          {activeSection === "apparence" && (
            <ProfileAppearanceSection preferences={preferences} />
          )}
          {activeSection === "notifications" && (
            <ProfileNotificationsSection preferences={preferences} />
          )}
          {activeSection === "raccourcis" && <ProfileShortcutsSection />}
        </div>
      </div>
    </div>
  );
}
