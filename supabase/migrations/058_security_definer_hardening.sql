-- ============================================================
-- Migration 058: Security hardening
-- 1. Ajouter SET search_path = public a toutes les fonctions SECURITY DEFINER
-- 2. Modifier notify_all_users() pour filtrer par role et status
-- 3. Mettre a jour les triggers pour ne notifier que les proprietaires
-- ============================================================

-- ============================================================
-- 1. Fonctions helper RBAC (de 039 + 043)
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_is_active()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT status = 'active' FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_status()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT status FROM public.profiles WHERE id = auth.uid()),
    'inactive'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- 2. Trigger de protection des champs role/status (de 043)
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_role_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF auth.uid() = OLD.id THEN
      NEW.role := OLD.role;
      NEW.status := OLD.status;
    ELSIF public.user_role() != 'proprietaire' THEN
      NEW.role := OLD.role;
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- 3. handle_new_user (de 043)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role, status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendeur'),
    COALESCE(NEW.raw_user_meta_data->>'status', 'active')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- 4. increment_or_invest_quantite (de 010)
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_or_invest_quantite(p_id UUID, p_qty INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.or_investissement
  SET quantite = quantite + p_qty,
      updated_at = now()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- 5. cancel_expired_acompte_lots (de 027)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_expired_acompte_lots()
RETURNS INTEGER AS $$
DECLARE
  cancelled_count INTEGER := 0;
  expired_lot RECORD;
BEGIN
  FOR expired_lot IN
    SELECT l.id, vl.bijoux_stock_id, bs.depot_vente_lot_id
    FROM public.lots l
    LEFT JOIN public.vente_lignes vl ON vl.lot_id = l.id
    LEFT JOIN public.bijoux_stock bs ON bs.id = vl.bijoux_stock_id
    WHERE l.type = 'vente'
      AND l.status = 'en_cours'
      AND l.acompte_paye = true
      AND l.solde_paye = false
      AND l.date_limite_solde < now()
  LOOP
    IF expired_lot.bijoux_stock_id IS NOT NULL THEN
      UPDATE public.bijoux_stock
      SET statut = CASE
        WHEN expired_lot.depot_vente_lot_id IS NOT NULL THEN 'en_depot_vente'
        ELSE 'en_stock'
      END
      WHERE id = expired_lot.bijoux_stock_id;
    END IF;

    UPDATE public.lots
    SET status = 'annule'
    WHERE id = expired_lot.id
      AND status = 'en_cours';

    cancelled_count := cancelled_count + 1;
  END LOOP;

  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- 6. create_notification (de 031)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- 7. notify_all_users — MODIFIE : filtre par role et status
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_all_users(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
  SELECT p.id, p_type, p_title, p_message, p_entity_type, p_entity_id
  FROM public.profiles p
  WHERE p.status = 'active'
    AND (p_role IS NULL OR p.role = p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- 8. Triggers de notification — MODIFIE : notifient uniquement les proprietaires
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_dossier_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.notify_all_users(
    'dossier_created',
    'Nouveau dossier',
    'Le dossier ' || NEW.numero || ' a ete cree.',
    'dossier',
    NEW.id,
    'proprietaire'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_lot_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.type = 'rachat' THEN
    IF NEW.status = 'accepte' THEN
      PERFORM public.notify_all_users(
        'lot_accepted',
        'Lot accepte',
        'Le lot ' || NEW.numero || ' a ete accepte par le client.',
        'lot',
        NEW.id,
        'proprietaire'
      );
    ELSIF NEW.status = 'finalise' THEN
      PERFORM public.notify_all_users(
        'lot_finalized',
        'Lot finalise',
        'Le lot ' || NEW.numero || ' a ete finalise.',
        'lot',
        NEW.id,
        'proprietaire'
      );
    ELSIF NEW.status = 'retracte' THEN
      PERFORM public.notify_all_users(
        'lot_retracted',
        'Lot retracte',
        'Le lot ' || NEW.numero || ' a ete retracte par le client.',
        'lot',
        NEW.id,
        'proprietaire'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_vente_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.type = 'vente' THEN
    IF NEW.status = 'en_cours' THEN
      PERFORM public.notify_all_users(
        'vente_created',
        'Nouvelle vente',
        'La vente ' || NEW.numero || ' est en cours.',
        'vente',
        NEW.id,
        'proprietaire'
      );
    ELSIF NEW.status = 'livre' THEN
      PERFORM public.notify_all_users(
        'vente_livree',
        'Vente livree',
        'La vente ' || NEW.numero || ' a ete livree.',
        'vente',
        NEW.id,
        'proprietaire'
      );
    ELSIF NEW.status = 'termine' THEN
      PERFORM public.notify_all_users(
        'vente_finalized',
        'Vente terminee',
        'La vente ' || NEW.numero || ' est terminee.',
        'vente',
        NEW.id,
        'proprietaire'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- 9. Fonctions cron email (de 034) — ajout SET search_path
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
  resend_key := current_setting('app.resend_api_key', true);
  from_email := coalesce(current_setting('app.resend_from_email', true), 'onboarding@resend.dev');
  recipient := current_setting('app.resend_test_recipient', true);

  IF resend_key IS NULL OR recipient IS NULL THEN
    RAISE LOG 'notify_lots_finalisables: missing resend_key or recipient config';
    RETURN 0;
  END IF;

  SELECT * INTO template_row
  FROM public.email_templates
  WHERE notification_type = 'interne_lot_finalisable'
    AND is_active = true;

  IF template_row IS NULL THEN
    RETURN 0;
  END IF;

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

    email_html := '<div style="font-family:sans-serif;max-width:580px;margin:0 auto;">'
      || '<div style="background:#18181b;padding:20px;text-align:center;border-radius:8px 8px 0 0;">'
      || '<span style="color:#fff;font-size:18px;font-weight:bold;">Or au Juste Prix</span></div>'
      || '<div style="padding:24px;background:#fff;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;">'
      || replace(rendered_body, E'\n', '<br/>')
      || '<br/><br/><span style="color:#a1a1aa;font-size:12px;">Email automatique — ne pas repondre</span>'
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
    VALUES ('interne_lot_finalisable', recipient, rendered_subject, 'sent', lot_row.lot_id, lot_row.dossier_id, lot_row.client_id);

    sent_count := sent_count + 1;
  END LOOP;

  RETURN sent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

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
      || '<br/><br/><span style="color:#a1a1aa;font-size:12px;">Email automatique — ne pas repondre</span>'
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
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;
