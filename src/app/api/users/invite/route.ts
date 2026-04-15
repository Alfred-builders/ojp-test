import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sensitiveApiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limiting
  const { success } = await sensitiveApiLimiter.limit(getClientIp(request));
  if (!success) return rateLimitResponse();

  // Verify caller is proprietaire
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "proprietaire" && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const { email, firstName, lastName, mode, password } = body as {
    email: string;
    firstName: string;
    lastName: string;
    mode: "invite" | "create";
    password?: string;
  };

  if (!email || !firstName || !lastName) {
    return NextResponse.json(
      { error: "Email, prénom et nom sont requis" },
      { status: 400 }
    );
  }

  try {
    if (mode === "invite") {
      const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: "vendeur",
            status: "pending",
          },
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Rewrite Supabase action_link to go through our auth callback
      const actionLink = data.properties?.action_link ?? "";
      let inviteLink = actionLink;
      if (actionLink) {
        const parsed = new URL(actionLink);
        const token_hash = parsed.searchParams.get("token") ?? "";
        const type = parsed.searchParams.get("type") ?? "invite";
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
        inviteLink = `${siteUrl}/auth/callback?token_hash=${token_hash}&type=${type}&next=/reset-password`;
      }

      return NextResponse.json({ user: data.user, inviteLink });
    } else {
      // Create user with password
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: "Le mot de passe doit contenir au moins 6 caractères" },
          { status: 400 }
        );
      }

      const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: "vendeur",
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ user: data.user });
    }
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }
}
