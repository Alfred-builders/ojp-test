-- ============================================================
-- Migration 091: Séparer bijoux et confié d'achat dans search_global
-- Les bijoux sans depot_vente_lot_id → entity_type 'bijoux', URL /stock/
-- Les bijoux avec depot_vente_lot_id → entity_type 'confie_achat', URL /confie-achat/
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_global(
  query TEXT,
  user_role TEXT DEFAULT 'vendeur'
)
RETURNS TABLE(
  entity_type TEXT,
  id UUID,
  title TEXT,
  subtitle TEXT,
  url TEXT
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
DECLARE
  search_term TEXT := '%' || query || '%';
  ts_query TSQUERY := plainto_tsquery('french', query);
BEGIN
  -- 1. Clients (full-text search + ILIKE fallback)
  RETURN QUERY
    SELECT 'client'::TEXT, c.id,
           COALESCE(c.first_name || ' ' || c.last_name, c.last_name, c.first_name, '')::TEXT,
           COALESCE(c.email, c.phone, c.city, '')::TEXT,
           ('/clients/' || c.id)::TEXT
    FROM public.clients c
    WHERE c.search_vector @@ ts_query
       OR c.first_name ILIKE search_term
       OR c.last_name ILIKE search_term
       OR c.email ILIKE search_term
       OR c.phone ILIKE search_term
    ORDER BY
      CASE WHEN c.search_vector @@ ts_query THEN 0 ELSE 1 END,
      c.last_name
    LIMIT 5;

  -- 2. Dossiers
  RETURN QUERY
    SELECT 'dossier'::TEXT, d.id, d.numero::TEXT,
           COALESCE(cl.first_name || ' ' || cl.last_name, '')::TEXT,
           ('/dossiers/' || d.id)::TEXT
    FROM public.dossiers d
    JOIN public.clients cl ON cl.id = d.client_id
    WHERE d.numero ILIKE search_term
       OR cl.first_name ILIKE search_term
       OR cl.last_name ILIKE search_term
    ORDER BY d.created_at DESC
    LIMIT 5;

  -- 3. Lots (type = rachat)
  RETURN QUERY
    SELECT 'lot'::TEXT, l.id, l.numero::TEXT,
           COALESCE(cl.first_name || ' ' || cl.last_name, '')::TEXT,
           ('/lots/' || l.id)::TEXT
    FROM public.lots l
    JOIN public.dossiers d ON d.id = l.dossier_id
    JOIN public.clients cl ON cl.id = d.client_id
    WHERE l.type = 'rachat'
      AND (l.numero ILIKE search_term
           OR cl.first_name ILIKE search_term
           OR cl.last_name ILIKE search_term)
    ORDER BY l.created_at DESC
    LIMIT 5;

  -- 4. Ventes (type = vente)
  RETURN QUERY
    SELECT 'vente'::TEXT, l.id, l.numero::TEXT,
           COALESCE(cl.first_name || ' ' || cl.last_name, '')::TEXT,
           ('/ventes/' || l.id)::TEXT
    FROM public.lots l
    JOIN public.dossiers d ON d.id = l.dossier_id
    JOIN public.clients cl ON cl.id = d.client_id
    WHERE l.type = 'vente'
      AND (l.numero ILIKE search_term
           OR cl.first_name ILIKE search_term
           OR cl.last_name ILIKE search_term)
    ORDER BY l.created_at DESC
    LIMIT 5;

  -- 5. Bijoux stock (rachat uniquement — sans depot_vente_lot_id)
  RETURN QUERY
    SELECT 'bijoux'::TEXT, b.id, b.nom::TEXT,
           COALESCE(b.metaux, '')::TEXT,
           ('/stock/' || b.id)::TEXT
    FROM public.bijoux_stock b
    WHERE b.depot_vente_lot_id IS NULL
      AND (b.nom ILIKE search_term
           OR b.description ILIKE search_term
           OR b.metaux ILIKE search_term)
    ORDER BY b.nom
    LIMIT 5;

  -- 6. Confié d'achat (dépôt-vente — avec depot_vente_lot_id)
  RETURN QUERY
    SELECT 'confie_achat'::TEXT, b.id, b.nom::TEXT,
           COALESCE(b.metaux, '')::TEXT,
           ('/confie-achat/' || b.id)::TEXT
    FROM public.bijoux_stock b
    WHERE b.depot_vente_lot_id IS NOT NULL
      AND (b.nom ILIKE search_term
           OR b.description ILIKE search_term
           OR b.metaux ILIKE search_term)
    ORDER BY b.nom
    LIMIT 5;

  -- 7. Or investissement
  RETURN QUERY
    SELECT 'or_investissement'::TEXT, oi.id, oi.designation::TEXT,
           COALESCE(oi.metal || ' · ' || COALESCE(oi.pays, ''), oi.metal, '')::TEXT,
           ('/or-investissement/' || oi.id)::TEXT
    FROM public.or_investissement oi
    WHERE oi.designation ILIKE search_term
       OR oi.metal ILIKE search_term
       OR oi.pays ILIKE search_term
    ORDER BY oi.designation
    LIMIT 5;
END;
$$;
