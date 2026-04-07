-- Set tony@alfred.builders as proprietaire
ALTER TABLE public.profiles DISABLE TRIGGER protect_role_fields_trigger;

UPDATE public.profiles SET role = 'proprietaire' WHERE email = 'tony@alfred.builders';

ALTER TABLE public.profiles ENABLE TRIGGER protect_role_fields_trigger;
