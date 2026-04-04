-- Ajout du type de rachat sur les références : rachat direct ou devis
ALTER TABLE public.lot_references
  ADD COLUMN IF NOT EXISTS type_rachat TEXT NOT NULL DEFAULT 'direct'
    CHECK (type_rachat IN ('direct', 'devis'));
