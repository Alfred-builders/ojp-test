-- ============================================================
-- Add document_id FK to reglements table
-- Links each payment directly to its corresponding document
-- ============================================================

ALTER TABLE public.reglements
  ADD COLUMN document_id UUID REFERENCES public.documents(id);

CREATE INDEX idx_reglements_document_id ON public.reglements(document_id);

-- Backfill existing reglements with matching document IDs

-- vente -> facture_vente
UPDATE public.reglements r
  SET document_id = d.id
  FROM public.documents d
  WHERE r.lot_id = d.lot_id
    AND r.type = 'vente'
    AND d.type = 'facture_vente'
    AND r.document_id IS NULL;

-- acompte -> facture_acompte
UPDATE public.reglements r
  SET document_id = d.id
  FROM public.documents d
  WHERE r.lot_id = d.lot_id
    AND r.type = 'acompte'
    AND d.type = 'facture_acompte'
    AND r.document_id IS NULL;

-- solde -> facture_solde
UPDATE public.reglements r
  SET document_id = d.id
  FROM public.documents d
  WHERE r.lot_id = d.lot_id
    AND r.type = 'solde'
    AND d.type = 'facture_solde'
    AND r.document_id IS NULL;

-- rachat -> quittance_rachat
UPDATE public.reglements r
  SET document_id = d.id
  FROM public.documents d
  WHERE r.lot_id = d.lot_id
    AND r.type = 'rachat'
    AND d.type = 'quittance_rachat'
    AND r.document_id IS NULL;

-- depot_vente -> quittance_depot_vente
UPDATE public.reglements r
  SET document_id = d.id
  FROM public.documents d
  WHERE r.lot_id = d.lot_id
    AND r.type = 'depot_vente'
    AND d.type = 'quittance_depot_vente'
    AND r.document_id IS NULL;
