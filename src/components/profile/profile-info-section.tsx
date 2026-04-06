"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FloppyDisk, UserCircle, Crown, Storefront } from "@phosphor-icons/react";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserRole } from "@/types/auth";

interface ProfileInfoSectionProps {
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    created_at: string | null;
    role: UserRole;
  };
  email: string;
}

export function ProfileInfoSection({ profile, email }: ProfileInfoSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Utilisateur";
  const initials =
    [profile.first_name?.[0], profile.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "U";

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError("");

    const supabase = createClient();
    const fileExt = file.name.split(".").pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const newAvatarUrl = `${publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ avatar_url: newAvatarUrl, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    setAvatarUrl(newAvatarUrl);
    setUploadingAvatar(false);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.updateUser({
      data: { first_name: firstName, last_name: lastName },
    });

    const { toast } = await import("sonner");
    toast.success("Profil mis à jour");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="relative group">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl ?? undefined} alt={fullName} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Camera size={20} weight="duotone" className="text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div className="space-y-1">
            <CardTitle>{fullName}</CardTitle>
            <CardDescription>{email}</CardDescription>
            <Badge variant="secondary" className="mt-1">
              {profile.role === "proprietaire" || role === "super_admin" ? (
                <>
                  <Crown size={12} weight="duotone" className="mr-1" />
                  Proprietaire
                </>
              ) : (
                <>
                  <Storefront size={12} weight="duotone" className="mr-1" />
                  Vendeur
                </>
              )}
            </Badge>
            {uploadingAvatar && (
              <p className="text-xs text-muted-foreground">
                Upload en cours...
              </p>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle size={20} weight="duotone" />
            Informations personnelles
          </CardTitle>
          <CardDescription>
            Modifiez vos informations de profil.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pb-6">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prenom</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  — ne peut pas etre modifie
                </span>
              </Label>
              <Input id="email" type="email" value={email} disabled />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              <FloppyDisk size={16} weight="duotone" />
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {profile.created_at && (
        <div className="text-sm text-muted-foreground">
          Compte cree le{" "}
          {formatDate(profile.created_at)}
        </div>
      )}
    </div>
  );
}
