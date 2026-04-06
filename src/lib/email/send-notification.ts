import { render } from "@react-email/components";
import { resend } from "./resend";
import { replaceVariables, buildVariablesMap, TEST_VARIABLES } from "./variables";
import { EmailWrapper } from "./wrapper";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { EmailNotificationType, EmailTemplate } from "@/types/email";
import type { CompanySettings } from "@/types/settings";
import React from "react";

interface SendNotificationParams {
  notification_type: EmailNotificationType;
  lot_id?: string;
  dossier_id?: string;
  client_id?: string;
  attachment_paths?: string[];
  extra_variables?: Record<string, string>;
  test?: boolean;
}

interface SendResult {
  success: boolean;
  resend_id?: string;
  error?: string;
}

export async function sendNotification(
  params: SendNotificationParams
): Promise<SendResult> {
  const {
    notification_type,
    lot_id,
    dossier_id,
    client_id,
    attachment_paths = [],
    extra_variables = {},
    test = false,
  } = params;

  try {
    // 1. Fetch template
    const { data: template, error: tmplError } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("notification_type", notification_type)
      .single<EmailTemplate>();

    if (tmplError || !template) {
      return { success: false, error: `Template not found: ${notification_type}` };
    }

    if (!template.is_active && !test) {
      return { success: true }; // Silently skip
    }

    // 2. Build variables
    let variables: Record<string, string>;

    if (test) {
      variables = { ...TEST_VARIABLES, ...extra_variables };
    } else {
      // Fetch entities from DB
      const [clientRes, dossierRes, lotRes, docsRes] = await Promise.all([
        client_id
          ? supabaseAdmin
              .from("clients")
              .select("civility, first_name, last_name, email")
              .eq("id", client_id)
              .single()
          : Promise.resolve({ data: null }),
        dossier_id
          ? supabaseAdmin
              .from("dossiers")
              .select("numero")
              .eq("id", dossier_id)
              .single()
          : Promise.resolve({ data: null }),
        lot_id
          ? supabaseAdmin
              .from("lots")
              .select(
                "numero, total_prix_achat, total_prix_revente, acompte_montant, date_limite_solde, mode_reglement"
              )
              .eq("id", lot_id)
              .single()
          : Promise.resolve({ data: null }),
        lot_id
          ? supabaseAdmin
              .from("documents")
              .select("type, numero")
              .eq("lot_id", lot_id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      variables = buildVariablesMap(notification_type, {
        client: clientRes.data ?? undefined,
        dossier: dossierRes.data ?? undefined,
        lot: lotRes.data ?? undefined,
        documents: docsRes.data ?? [],
        extra: extra_variables,
      });
    }

    // 3. Replace variables in subject and body
    const subject = replaceVariables(template.subject, variables);
    const bodyText = replaceVariables(template.body, variables);

    // 4. Resolve attachment paths — auto-fetch from DB if not provided
    let resolvedPaths = [...attachment_paths];
    if (resolvedPaths.length === 0 && lot_id && !test) {
      resolvedPaths = await getAutoAttachmentPaths(notification_type, lot_id);
    }

    // 5. Download PDF attachments
    const attachments: Array<{ filename: string; content: Buffer }> = [];
    for (const path of resolvedPaths) {
      const { data: fileData, error: dlError } = await supabaseAdmin.storage
        .from("documents")
        .download(path);

      if (!dlError && fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const filename = path.split("/").pop() ?? "document.pdf";
        attachments.push({ filename, content: buffer });
      }
    }

    // 6. Render HTML
    const html = await render(
      React.createElement(EmailWrapper, { body: bodyText })
    );

    // 7. Determine recipient
    const testRecipient = process.env.RESEND_TEST_RECIPIENT;
    let recipientEmail: string;

    if (test || testRecipient) {
      // Test mode: always send to test recipient
      recipientEmail = testRecipient || "";
    } else if (template.category === "interne") {
      recipientEmail = process.env.RESEND_TEST_RECIPIENT || "";
    } else {
      recipientEmail = variables.client_email || "";
    }

    if (!recipientEmail) {
      return { success: false, error: "No recipient email" };
    }

    // 8. Send via Resend — use company settings for sender name/email
    const { data: companyRow } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "company")
      .single();
    const company = companyRow?.value as CompanySettings | undefined;
    const fromEmail = company?.email_expediteur || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromName = company?.nom_expediteur || "Or au Juste Prix";
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // 9. Log
    await supabaseAdmin.from("email_logs").insert({
      notification_type,
      recipient_email: recipientEmail,
      subject,
      resend_id: sendData?.id ?? null,
      status: sendError ? "failed" : "sent",
      error_message: sendError?.message ?? null,
      lot_id: lot_id ?? null,
      dossier_id: dossier_id ?? null,
      client_id: client_id ?? null,
    });

    if (sendError) {
      return { success: false, error: sendError.message };
    }

    return { success: true, resend_id: sendData?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Log failure
    try {
      await supabaseAdmin.from("email_logs").insert({
        notification_type,
        recipient_email: "unknown",
        subject: "Error",
        status: "failed",
        error_message: message,
        lot_id: lot_id ?? null,
        dossier_id: dossier_id ?? null,
        client_id: client_id ?? null,
      });
    } catch {
      // Ignore logging errors
    }

    return { success: false, error: message };
  }
}

/**
 * Auto-resolve attachment paths from the documents table based on notification type.
 * Maps each notification type to the document types it should attach.
 */
const NOTIFICATION_DOCUMENT_TYPES: Partial<Record<EmailNotificationType, string[]>> = {
  devis_envoye: ["devis_rachat"],
  contrat_rachat_finalise: ["contrat_rachat", "quittance_rachat"],
  contrat_depot_vente: ["contrat_depot_vente"],
  facture_acompte: ["facture_acompte"],
  facture_vente: ["facture_vente"],
  quittance_depot_vente: ["quittance_depot_vente"],
};

async function getAutoAttachmentPaths(
  notificationType: EmailNotificationType,
  lotId: string
): Promise<string[]> {
  const docTypes = NOTIFICATION_DOCUMENT_TYPES[notificationType];
  if (!docTypes || docTypes.length === 0) return [];

  const { data: docs } = await supabaseAdmin
    .from("documents")
    .select("storage_path, type")
    .eq("lot_id", lotId)
    .in("type", docTypes)
    .order("created_at", { ascending: false });

  if (!docs) return [];

  // For each doc type, take only the most recent one
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const doc of docs) {
    if (!seen.has(doc.type)) {
      seen.add(doc.type);
      paths.push(doc.storage_path);
    }
  }

  return paths;
}
