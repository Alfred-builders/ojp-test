-- Add photo_url column to lots table for storing a photo of the lot (e.g. jewelry tray)
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS photo_url TEXT;
