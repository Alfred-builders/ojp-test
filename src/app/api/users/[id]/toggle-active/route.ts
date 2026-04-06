import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sensitiveApiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import type { UserStatus, UserRole } from "@/types/auth";

export async function PATCH(
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
        { error: "Vous ne pouvez pas modifier votre propre compte" },
        { status: 400 }
      );
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const callerRole = callerProfile?.role as UserRole | undefined;

    if (callerRole !== "proprietaire" && callerRole !== "super_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { status: newStatus, role: newRole } = body as {
      status?: UserStatus;
      role?: UserRole;
    };

    // Handle role change
    if (newRole) {
      if (!["super_admin", "proprietaire", "vendeur"].includes(newRole)) {
        return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
      }

      // Only super_admin can change roles of proprietaire
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", id)
        .single();

      if (targetProfile?.role === "proprietaire" && callerRole !== "super_admin") {
        return NextResponse.json(
          { error: "Seul un super admin peut modifier le rôle d'un propriétaire" },
          { status: 403 }
        );
      }

      if (targetProfile?.role === "super_admin") {
        return NextResponse.json(
          { error: "Impossible de modifier le rôle d'un super admin" },
          { status: 403 }
        );
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: newRole })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: "Erreur lors du changement de rôle" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // Handle status change
    if (newStatus) {
      if (!["active", "inactive"].includes(newStatus)) {
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 400 });
      }

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
    }

    return NextResponse.json({ error: "Aucune action spécifiée" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
