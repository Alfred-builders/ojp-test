-- ============================================================
-- Migration 057: Rappel automatique articles dépôt-vente invendus
-- Ajoute date_fin_contrat sur lots + cron de notification
-- ============================================================

-- 1. Ajouter la colonne date de fin de contrat
ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS date_fin_contrat TIMESTAMPTZ;

-- 2. Template email pour rappel dépôt-vente invendu
INSERT INTO public.email_templates (notification_type, label, subject, body, is_active, category, available_variables)
VALUES (
  'interne_depot_vente_invendu',
  'Rappel dépôt-vente invendu',
  'Rappel : Articles dépôt-vente invendus — {{lot_numero}}',
  'Bonjour,

Le contrat de dépôt-vente {{lot_numero}} (dossier {{dossier_numero}}) pour {{client_prenom}} {{client_nom}} est arrivé à échéance le {{date_fin_contrat}}.

Les articles n''ont pas été vendus. Conformément aux conditions générales, une notification doit être adressée au client pour l''informer de ses options (récupération, cession, destruction ou frais de garde).

Merci de traiter ce dossier.

— Notification automatique du {{date}}',
  true,
  'interne',
  '["client_nom", "client_prenom", "lot_numero", "dossier_numero", "date_fin_contrat", "date"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 3. Fonction cron de notification
CREATE OR REPLACE FUNCTION public.notify_depot_vente_invendus()
RETURNS INTEGER AS $$
DECLARE
  sent_count INTEGER := 0;
  lot_row RECORD;
  template_row RECORD;
  rendered_subject TEXT;
  rendered_body TEXT;
  email_html TEXT;
  resend_key TEXT;
  from_email TEXT;
  recipient TEXT;
BEGIN
  resend_key := current_setting('app.resend_api_key', true);
  from_email := coalesce(current_setting('app.resend_from_email', true), 'onboarding@resend.dev');
  recipient := current_setting('app.resend_test_recipient', true);

  IF resend_key IS NULL OR recipient IS NULL THEN
    RAISE LOG 'notify_depot_vente_invendus: missing resend_key or recipient config';
    RETURN 0;
  END IF;

  SELECT * INTO template_row
  FROM public.email_templates
  WHERE notification_type = 'interne_depot_vente_invendu'
    AND is_active = true;

  IF template_row IS NULL THEN
    RETURN 0;
  END IF;

  FOR lot_row IN
    SELECT
      l.id AS lot_id,
      l.numero AS lot_numero,
      l.dossier_id,
      l.date_fin_contrat,
      d.numero AS dossier_numero,
      c.id AS client_id,
      c.first_name,
      c.last_name
    FROM public.lots l
    JOIN public.dossiers d ON d.id = l.dossier_id
    JOIN public.clients c ON c.id = d.client_id
    WHERE l.type = 'depot_vente'
      AND l.status NOT IN ('finalise', 'retracte', 'refuse')
      AND l.date_fin_contrat IS NOT NULL
      AND l.date_fin_contrat < now()
      AND NOT EXISTS (
        SELECT 1 FROM public.email_logs el
        WHERE el.lot_id = l.id
          AND el.notification_type = 'interne_depot_vente_invendu'
          AND el.status = 'sent'
      )
  LOOP
    rendered_subject := template_row.subject;
    rendered_body := template_row.body;

    rendered_subject := replace(rendered_subject, '{{client_nom}}', coalesce(lot_row.last_name, ''));
    rendered_subject := replace(rendered_subject, '{{client_prenom}}', coalesce(lot_row.first_name, ''));
    rendered_subject := replace(rendered_subject, '{{lot_numero}}', coalesce(lot_row.lot_numero, ''));
    rendered_subject := replace(rendered_subject, '{{dossier_numero}}', coalesce(lot_row.dossier_numero, ''));
    rendered_subject := replace(rendered_subject, '{{date_fin_contrat}}', coalesce(to_char(lot_row.date_fin_contrat, 'DD/MM/YYYY'), ''));
    rendered_subject := replace(rendered_subject, '{{date}}', to_char(now(), 'DD/MM/YYYY'));

    rendered_body := replace(rendered_body, '{{client_nom}}', coalesce(lot_row.last_name, ''));
    rendered_body := replace(rendered_body, '{{client_prenom}}', coalesce(lot_row.first_name, ''));
    rendered_body := replace(rendered_body, '{{lot_numero}}', coalesce(lot_row.lot_numero, ''));
    rendered_body := replace(rendered_body, '{{dossier_numero}}', coalesce(lot_row.dossier_numero, ''));
    rendered_body := replace(rendered_body, '{{date_fin_contrat}}', coalesce(to_char(lot_row.date_fin_contrat, 'DD/MM/YYYY'), ''));
    rendered_body := replace(rendered_body, '{{date}}', to_char(now(), 'DD/MM/YYYY'));

    email_html := '<div style="font-family:sans-serif;max-width:580px;margin:0 auto;">'
      || '<div style="background:#18181b;padding:20px;text-align:center;border-radius:8px 8px 0 0;">'
      || '<span style="color:#fff;font-size:18px;font-weight:bold;">Or au Juste Prix</span></div>'
      || '<div style="padding:24px;background:#fff;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;">'
      || replace(rendered_body, E'\n', '<br/>')
      || '<br/><br/><span style="color:#a1a1aa;font-size:12px;">Email automatique — ne pas répondre</span>'
      || '</div></div>';

    PERFORM net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || resend_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', 'Or au Juste Prix <' || from_email || '>',
        'to', ARRAY[recipient],
        'subject', rendered_subject,
        'html', email_html
      )
    );

    -- Insert notification for in-app display
    INSERT INTO public.notifications (type, title, message, lot_id, dossier_id)
    VALUES (
      'depot_vente_expire',
      'Dépôt-vente expiré : ' || lot_row.lot_numero,
      'Le contrat de dépôt-vente pour ' || lot_row.first_name || ' ' || lot_row.last_name || ' est arrivé à échéance.',
      lot_row.lot_id,
      lot_row.dossier_id
    );

    INSERT INTO public.email_logs (notification_type, recipient_email, subject, status, lot_id, dossier_id, client_id)
    VALUES ('interne_depot_vente_invendu', recipient, rendered_subject, 'sent', lot_row.lot_id, lot_row.dossier_id, lot_row.client_id);

    sent_count := sent_count + 1;
  END LOOP;

  RETURN sent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Pour activer le cron job (à exécuter manuellement dans le SQL Editor Supabase) :
--   SELECT cron.schedule('notify-depot-vente-invendus', '0 9 * * *', 'SELECT public.notify_depot_vente_invendus()');
-- Ce job tourne tous les jours à 9h.
-- ============================================================
