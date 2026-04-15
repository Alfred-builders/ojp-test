import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sensitiveApiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      );
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "proprietaire" && callerProfile?.role !== "super_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { data: targetProfile } = await getSupabaseAdmin()
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();

    if (targetProfile?.role === "super_admin") {
      return NextResponse.json(
        { error: "Impossible de supprimer un super admin" },
        { status: 400 }
      );
    }

    if (targetProfile?.role === "proprietaire" && callerProfile?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Seul un super admin peut supprimer un propriétaire" },
        { status: 400 }
      );
    }

    // Soft delete : marquer comme "deleted" au lieu de supprimer
    const { error: profileError } = await getSupabaseAdmin()
      .from("profiles")
      .update({ status: "deleted" })
      .eq("id", id);

    if (profileError) {
      return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 400 });
    }

    // Bannir de Supabase Auth pour empêcher la connexion
    await getSupabaseAdmin().auth.admin.updateUserById(id, {
      ban_duration: "876000h",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
