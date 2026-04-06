-- ============================================================
-- Migration 032: Triggers de notifications automatiques
-- ============================================================

-- ============================================================
-- 1. Nouveau dossier créé
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_dossier_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.notify_all_users(
    'dossier_created',
    'Nouveau dossier',
    'Le dossier ' || NEW.numero || ' a été créé.',
    'dossier',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_dossier_created_trigger
  AFTER INSERT ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dossier_created();

-- ============================================================
-- 2. Changement de statut d'un lot (rachat)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_lot_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.type = 'rachat' THEN
    IF NEW.status = 'accepte' THEN
      PERFORM public.notify_all_users(
        'lot_accepted',
        'Lot accepté',
        'Le lot ' || NEW.numero || ' a été accepté par le client.',
        'lot',
        NEW.id
      );
    ELSIF NEW.status = 'finalise' THEN
      PERFORM public.notify_all_users(
        'lot_finalized',
        'Lot finalisé',
        'Le lot ' || NEW.numero || ' a été finalisé.',
        'lot',
        NEW.id
      );
    ELSIF NEW.status = 'retracte' THEN
      PERFORM public.notify_all_users(
        'lot_retracted',
        'Lot rétracté',
        'Le lot ' || NEW.numero || ' a été rétracté par le client.',
        'lot',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_lot_status_change_trigger
  AFTER UPDATE ON public.lots
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lot_status_change();

-- ============================================================
-- 3. Changement de statut d'un lot vente
-- ============================================================
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
        NEW.id
      );
    ELSIF NEW.status = 'livre' THEN
      PERFORM public.notify_all_users(
        'vente_livree',
        'Vente livrée',
        'La vente ' || NEW.numero || ' a été livrée.',
        'vente',
        NEW.id
      );
    ELSIF NEW.status = 'termine' THEN
      PERFORM public.notify_all_users(
        'vente_finalized',
        'Vente terminée',
        'La vente ' || NEW.numero || ' est terminée.',
        'vente',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_vente_status_change_trigger
  AFTER UPDATE ON public.lots
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vente_status_change();
