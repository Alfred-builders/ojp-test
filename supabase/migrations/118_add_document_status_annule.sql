-- Add 'annule' status for documents (e.g. confié d'achat when reference is restituted)
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_status_check
  CHECK (status IN ('en_attente', 'accepte', 'refuse', 'signe', 'regle', 'emis', 'annule'));
