-- Fix ambiguous notify_all_users function (two signatures exist)
-- Drop the old 5-arg version, keep only the 6-arg version from migration 094

DROP FUNCTION IF EXISTS public.notify_all_users(TEXT, TEXT, TEXT, TEXT, UUID);
