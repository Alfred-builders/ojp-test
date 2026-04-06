import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sensitiveApiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import type { UserStatus } from "@/types/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
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

    if (user.id === id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas modifier votre propre statut" },
        { status: 400 }
      );
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "proprietaire") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { status: newStatus } = body as { status: UserStatus };

    if (!["active", "inactive"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 }
      );
    }

    // Update profile via admin client (bypasses RLS)
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 400 });
    }

    // Also ban/unban at Supabase Auth level
    if (newStatus === "inactive") {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: "876000h",
      });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: "none",
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
