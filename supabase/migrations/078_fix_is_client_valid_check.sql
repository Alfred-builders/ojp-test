-- ============================================================
-- Migration 078: Corriger is_client_valid
-- Vérifier toute pièce d'identité non expirée, pas seulement la principale
-- + recalculer la validité de tous les clients
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_client_valid(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.client_identity_documents
    WHERE client_id = p_client_id
      AND expiry_date IS NOT NULL
      AND expiry_date >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Recalculer la validité de tous les clients
UPDATE public.clients SET is_valid = public.is_client_valid(id);
