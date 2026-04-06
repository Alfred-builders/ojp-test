-- ============================================================
-- Migration 034: Cron jobs pour notifications email deadlines
-- Utilise pg_cron + pg_net pour envoyer via Resend
-- ============================================================

-- ============================================================
-- 1. Fonction : notifier les lots finalisables (rétractation expirée)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_lots_finalisables()
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
  -- Récupérer les secrets depuis les variables vault ou config
  resend_key := current_setting('app.resend_api_key', true);
  from_email := coalesce(current_setting('app.resend_from_email', true), 'onboarding@resend.dev');
  recipient := current_setting('app.resend_test_recipient', true);

  IF resend_key IS NULL OR recipient IS NULL THEN
    RAISE LOG 'notify_lots_finalisables: missing resend_key or recipient config';
    RETURN 0;
  END IF;

  -- Charger le template
  SELECT * INTO template_row
  FROM public.email_templates
  WHERE notification_type = 'interne_lot_finalisable'
    AND is_active = true;

  IF template_row IS NULL THEN
    RETURN 0;
  END IF;

  -- Chercher les lots éligibles (rétractation expirée, pas encore notifié)
  FOR lot_row IN
    SELECT
      l.id AS lot_id,
      l.numero AS lot_numero,
      l.dossier_id,
      l.total_prix_achat,
      d.numero AS dossier_numero,
      c.id AS client_id,
      c.civility,
      c.first_name,
      c.last_name
    FROM public.lots l
    JOIN public.dossiers d ON d.id = l.dossier_id
    JOIN public.clients c ON c.id = d.client_id
    WHERE l.status = 'en_retractation'
      AND l.date_fin_retractation < now()
      AND NOT EXISTS (
        SELECT 1 FROM public.email_logs el
        WHERE el.lot_id = l.id
          AND el.notification_type = 'interne_lot_finalisable'
          AND el.status = 'sent'
      )
  LOOP
    -- Remplacer les variables
    rendered_subject := template_row.subject;
    rendered_body := template_row.body;

    rendered_subject := replace(rendered_subject, '{{client_nom}}', coalesce(lot_row.last_name, ''));
    rendered_subject := replace(rendered_subject, '{{client_prenom}}', coalesce(lot_row.first_name, ''));
    rendered_subject := replace(rendered_subject, '{{lot_numero}}', coalesce(lot_row.lot_numero, ''));
    rendered_subject := replace(rendered_subject, '{{dossier_numero}}', coalesce(lot_row.dossier_numero, ''));
    rendered_subject := replace(rendered_subject, '{{montant_total}}', coalesce(to_char(lot_row.total_prix_achat, 'FM999G999D00'), ''));
    rendered_subject := replace(rendered_subject, '{{date}}', to_char(now(), 'DD/MM/YYYY'));

    rendered_body := replace(rendered_body, '{{client_nom}}', coalesce(lot_row.last_name, ''));
    rendered_body := replace(rendered_body, '{{client_prenom}}', coalesce(lot_row.first_name, ''));
    rendered_body := replace(rendered_body, '{{lot_numero}}', coalesce(lot_row.lot_numero, ''));
    rendered_body := replace(rendered_body, '{{dossier_numero}}', coalesce(lot_row.dossier_numero, ''));
    rendered_body := replace(rendered_body, '{{montant_total}}', coalesce(to_char(lot_row.total_prix_achat, 'FM999G999D00'), ''));
    rendered_body := replace(rendered_body, '{{date}}', to_char(now(), 'DD/MM/YYYY'));

    -- Construire le HTML simple
    email_html := '<div style="font-family:sans-serif;max-width:580px;margin:0 auto;">'
      || '<div style="background:#18181b;padding:20px;text-align:center;border-radius:8px 8px 0 0;">'
      || '<span style="color:#fff;font-size:18px;font-weight:bold;">Or au Juste Prix</span></div>'
      || '<div style="padding:24px;background:#fff;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;">'
      || replace(rendered_body, E'\n', '<br/>')
      || '<br/><br/><span style="color:#a1a1aa;font-size:12px;">Email automatique — ne pas répondre</span>'
      || '</div></div>';

    -- Envoyer via pg_net → Resend API
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

    -- Logger
    INSERT INTO public.email_logs (notification_type, recipient_email, subject, status, lot_id, dossier_id, client_id)
    VALUES ('interne_lot_finalisable', recipient, rendered_subject, 'sent', lot_row.lot_id, lot_row.dossier_id, lot_row.client_id);

    sent_count := sent_count + 1;
  END LOOP;

  RETURN sent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 2. Fonction : notifier les acomptes expirés
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_acomptes_expires()
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
    RAISE LOG 'notify_acomptes_expires: missing resend_key or recipient config';
    RETURN 0;
  END IF;

  SELECT * INTO template_row
  FROM public.email_templates
  WHERE notification_type = 'interne_acompte_expire'
    AND is_active = true;

  IF template_row IS NULL THEN
    RETURN 0;
  END IF;

  FOR lot_row IN
    SELECT
      l.id AS lot_id,
      l.numero AS lot_numero,
      l.dossier_id,
      l.acompte_montant,
      l.date_limite_solde,
      d.numero AS dossier_numero,
      c.id AS client_id,
      c.first_name,
      c.last_name
    FROM public.lots l
    JOIN public.dossiers d ON d.id = l.dossier_id
    JOIN public.clients c ON c.id = d.client_id
    WHERE l.type = 'vente'
      AND l.status = 'en_cours'
      AND l.acompte_paye = true
      AND l.solde_paye = false
      AND l.date_limite_solde < now()
      AND NOT EXISTS (
        SELECT 1 FROM public.email_logs el
        WHERE el.lot_id = l.id
          AND el.notification_type = 'interne_acompte_expire'
          AND el.status = 'sent'
      )
  LOOP
    rendered_subject := template_row.subject;
    rendered_body := template_row.body;

    rendered_subject := replace(rendered_subject, '{{client_nom}}', coalesce(lot_row.last_name, ''));
    rendered_subject := replace(rendered_subject, '{{client_prenom}}', coalesce(lot_row.first_name, ''));
    rendered_subject := replace(rendered_subject, '{{lot_numero}}', coalesce(lot_row.lot_numero, ''));
    rendered_subject := replace(rendered_subject, '{{dossier_numero}}', coalesce(lot_row.dossier_numero, ''));
    rendered_subject := replace(rendered_subject, '{{montant_acompte}}', coalesce(to_char(lot_row.acompte_montant, 'FM999G999D00'), ''));
    rendered_subject := replace(rendered_subject, '{{date_limite_solde}}', coalesce(to_char(lot_row.date_limite_solde, 'DD/MM/YYYY'), ''));
    rendered_subject := replace(rendered_subject, '{{date}}', to_char(now(), 'DD/MM/YYYY'));

    rendered_body := replace(rendered_body, '{{client_nom}}', coalesce(lot_row.last_name, ''));
    rendered_body := replace(rendered_body, '{{client_prenom}}', coalesce(lot_row.first_name, ''));
    rendered_body := replace(rendered_body, '{{lot_numero}}', coalesce(lot_row.lot_numero, ''));
    rendered_body := replace(rendered_body, '{{dossier_numero}}', coalesce(lot_row.dossier_numero, ''));
    rendered_body := replace(rendered_body, '{{montant_acompte}}', coalesce(to_char(lot_row.acompte_montant, 'FM999G999D00'), ''));
    rendered_body := replace(rendered_body, '{{date_limite_solde}}', coalesce(to_char(lot_row.date_limite_solde, 'DD/MM/YYYY'), ''));
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

    INSERT INTO public.email_logs (notification_type, recipient_email, subject, status, lot_id, dossier_id, client_id)
    VALUES ('interne_acompte_expire', recipient, rendered_subject, 'sent', lot_row.lot_id, lot_row.dossier_id, lot_row.client_id);

    sent_count := sent_count + 1;
  END LOOP;

  RETURN sent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. Instructions pour activer les cron jobs
-- ============================================================
-- Prérequis : activer les extensions pg_cron et pg_net dans le dashboard Supabase
--   → Database > Extensions > chercher "pg_cron" → Enable
--   → Database > Extensions > chercher "pg_net" → Enable
--
-- Puis configurer les secrets (à exécuter dans le SQL Editor de Supabase) :
--   ALTER DATABASE postgres SET app.resend_api_key = 're_VbtSWRaC_5z7epYYDHTaFrDijePaFUyxW';
--   ALTER DATABASE postgres SET app.resend_from_email = 'onboarding@resend.dev';
--   ALTER DATABASE postgres SET app.resend_test_recipient = 'marwan@alfred.builders';
--
-- Enfin, programmer les cron jobs (toutes les heures) :
--   SELECT cron.schedule('notify-lots-finalisables', '0 * * * *', 'SELECT public.notify_lots_finalisables()');
--   SELECT cron.schedule('notify-acomptes-expires', '0 * * * *', 'SELECT public.notify_acomptes_expires()');
--
-- Pour vérifier les jobs actifs :
--   SELECT * FROM cron.job;
--
-- Pour tester manuellement :
--   SELECT public.notify_lots_finalisables();
--   SELECT public.notify_acomptes_expires();
