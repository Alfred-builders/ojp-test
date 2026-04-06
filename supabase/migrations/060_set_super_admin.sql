-- Temporarily disable trigger to set super_admin
ALTER TABLE public.profiles DISABLE TRIGGER protect_role_fields_trigger;

UPDATE public.profiles SET role = 'super_admin' WHERE email = 'marwan@alfred.builders';

ALTER TABLE public.profiles ENABLE TRIGGER protect_role_fields_trigger;
