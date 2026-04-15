-- ============================================================
-- Migration 094: Fix notification triggers
-- 1. notify_all_users() respects settings + user preferences
-- 2. Unified lot trigger (covers rachat, depot_vente, vente)
-- 3. New triggers: dossier_finalized, client_created, commande_received
-- 4. Remove dead vente_livree from CHECK constraint
-- ============================================================

-- ============================================================
-- 1. Rewrite notify_all_users() to respect preferences
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
DECLARE
  v_type_enabled BOOLEAN;
BEGIN
  -- Check if this notification type is enabled in global settings
  SELECT (value::jsonb -> 'types' ->> p_type)::boolean
  INTO v_type_enabled
  FROM public.settings
  WHERE key = 'notifications';

  -- If explicitly disabled, skip entirely
  IF v_type_enabled IS NOT NULL AND v_type_enabled = false THEN
    RETURN;
  END IF;

  -- Insert only for active users with notif_in_app enabled
  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
  SELECT p.id, p_type, p_title, p_message, p_entity_type, p_entity_id
  FROM public.profiles p
  LEFT JOIN public.user_preferences up ON up.user_id = p.id
  WHERE p.status = 'active'
    AND (p_role IS NULL OR p.role = p_role)
    AND COALESCE(up.notif_in_app, true) = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. Drop old lot triggers and create unified one
-- ============================================================
DROP TRIGGER IF EXISTS notify_lot_status_change_trigger ON public.lots;
DROP TRIGGER IF EXISTS notify_vente_status_change_trigger ON public.lots;
DROP FUNCTION IF EXISTS public.notify_lot_status_change();
DROP FUNCTION IF EXISTS public.notify_vente_status_change();

CREATE OR REPLACE FUNCTION public.notify_lot_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Rachat / Depot-vente: date_acceptation set (lot accepted)
  IF (NEW.type = 'rachat' OR NEW.type = 'depot_vente')
     AND OLD.date_acceptation IS NULL
     AND NEW.date_acceptation IS NOT NULL THEN
    PERFORM public.notify_all_users(
      'lot_accepted',
      'Lot accepté',
      'Le lot ' || NEW.numero || ' a été accepté par le client.',
      'lot',
      NEW.id
    );
  END IF;

  -- Any type: status changed to finalise
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'finalise' THEN
    -- Retracted
    IF NEW.outcome = 'retracte' THEN
      PERFORM public.notify_all_users(
        'lot_retracted',
        'Lot rétracté',
        'Le lot ' || NEW.numero || ' a été rétracté par le client.',
        'lot',
        NEW.id
      );
    -- Finalized rachat or depot_vente
    ELSIF (NEW.type = 'rachat' OR NEW.type = 'depot_vente')
          AND (NEW.outcome IS NULL OR NEW.outcome IN ('complete', 'termine')) THEN
      PERFORM public.notify_all_users(
        'lot_finalized',
        'Lot finalisé',
        'Le lot ' || NEW.numero || ' a été finalisé.',
        'lot',
        NEW.id
      );
    -- Finalized vente
    ELSIF NEW.type = 'vente'
          AND (NEW.outcome IS NULL OR NEW.outcome IN ('complete', 'termine')) THEN
      PERFORM public.notify_all_users(
        'vente_finalized',
        'Vente terminée',
        'La vente ' || NEW.numero || ' est terminée.',
        'vente',
        NEW.id
      );
    END IF;
  END IF;

  -- Vente: status changed to en_cours (vente created)
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.type = 'vente'
     AND NEW.status = 'en_cours' THEN
    PERFORM public.notify_all_users(
      'vente_created',
      'Nouvelle vente',
      'La vente ' || NEW.numero || ' est en cours.',
      'vente',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_lot_change_trigger
  AFTER UPDATE ON public.lots
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lot_change();

-- ============================================================
-- 3a. Dossier finalized trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_dossier_finalized()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'finalise' THEN
    PERFORM public.notify_all_users(
      'dossier_finalized',
      'Dossier finalisé',
      'Le dossier ' || NEW.numero || ' a été finalisé.',
      'dossier',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_dossier_finalized_trigger
  AFTER UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dossier_finalized();

-- ============================================================
-- 3b. Client created trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_client_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.notify_all_users(
    'client_created',
    'Nouveau client',
    COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '') || ' a été ajouté.',
    'client',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_client_created_trigger
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_created();

-- ============================================================
-- 3c. Commande received trigger (bon de commande → reçu)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_commande_received()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.statut IS DISTINCT FROM NEW.statut AND NEW.statut = 'recu' THEN
    PERFORM public.notify_all_users(
      'commande_received',
      'Commande reçue',
      'Le bon de commande ' || NEW.numero || ' a été reçu.',
      'commande',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_commande_received_trigger
  AFTER UPDATE ON public.bons_commande
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_commande_received();

-- ============================================================
-- 4. Update CHECK constraint: remove vente_livree, keep rest
-- ============================================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'dossier_created',
    'dossier_finalized',
    'lot_accepted',
    'lot_finalized',
    'lot_retracted',
    'vente_created',
    'vente_finalized',
    'commande_received',
    'client_created',
    'system'
  ));

-- Delete any orphan vente_livree notifications
DELETE FROM public.notifications WHERE type = 'vente_livree';

-- ============================================================
-- 5. Update notifications settings seed: remove vente_livree
-- ============================================================
UPDATE public.settings
SET value = jsonb_set(
  value,
  '{types}',
  (value -> 'types') - 'vente_livree'
)
WHERE key = 'notifications'
  AND value -> 'types' ? 'vente_livree';
