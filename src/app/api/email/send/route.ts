import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/email/send-notification";
import { sensitiveApiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import type { SendEmailRequest, EmailNotificationType } from "@/types/email";

const VALID_TYPES: EmailNotificationType[] = [
  "devis_envoye",
  "contrat_rachat_finalise",
  "contrat_depot_vente",
  "facture_acompte",
  "facture_vente",
  "quittance_depot_vente",
  "interne_devis_accepte",
  "interne_retractation",
  "interne_lot_finalisable",
  "interne_acompte_expire",
];

export async function POST(request: NextRequest) {
  // Rate limiting
  const { success } = await sensitiveApiLimiter.limit(getClientIp(request));
  if (!success) return rateLimitResponse();

  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify caller is proprietaire
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "proprietaire" && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Parse body
  let body: SendEmailRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate notification_type
  if (!body.notification_type || !VALID_TYPES.includes(body.notification_type)) {
    return NextResponse.json(
      { error: `Invalid notification_type: ${body.notification_type}` },
      { status: 400 }
    );
  }

  // Dedupe check (skip for test mode): prevent sending same notification twice for same lot
  if (!body.test && body.lot_id) {
    const { data: existingLog } = await supabase
      .from("email_logs")
      .select("id")
      .eq("notification_type", body.notification_type)
      .eq("lot_id", body.lot_id)
      .eq("status", "sent")
      .limit(1);

    if (existingLog && existingLog.length > 0) {
      return NextResponse.json({ success: true, skipped: true });
    }
  }

  // Send
  const result = await sendNotification({
    notification_type: body.notification_type,
    lot_id: body.lot_id,
    dossier_id: body.dossier_id,
    client_id: body.client_id,
    attachment_paths: body.attachment_paths,
    extra_variables: body.extra_variables,
    test: body.test,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, resend_id: result.resend_id });
}
