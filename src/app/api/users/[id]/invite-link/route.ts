import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sensitiveApiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { success } = await sensitiveApiLimiter.limit(getClientIp(request));
  if (!success) return rateLimitResponse();

  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "proprietaire" && callerProfile?.role !== "super_admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Get the target user's email
  const { data: targetProfile } = await supabaseAdmin
    .from("profiles")
    .select("email, status")
    .eq("id", id)
    .single();

  if (!targetProfile?.email) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (targetProfile.status !== "pending") {
    return NextResponse.json({ error: "L'utilisateur n'est pas en attente" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: targetProfile.email,
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

    return NextResponse.json({ inviteLink });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
