-- Seed data : dossiers de test pour Or au Juste Prix
-- Note: le numéro est généré automatiquement par le trigger, on passe une valeur vide
INSERT INTO public.dossiers (numero, client_id, status, notes, created_by) VALUES
('', (SELECT id FROM public.clients WHERE email = 'jean.dupont@email.fr' LIMIT 1), 'ouvert', 'Achat de bijoux en or 750 — en attente évaluation', (SELECT id FROM public.profiles LIMIT 1)),
('', (SELECT id FROM public.clients WHERE email = 'marie.martin@gmail.com' LIMIT 1), 'ouvert', 'Vente de bague et collier platine', (SELECT id FROM public.profiles LIMIT 1)),
('', (SELECT id FROM public.clients WHERE email = 'p.bernard@outlook.fr' LIMIT 1), 'ferme', 'Rachat de pièces en or — dossier clôturé', (SELECT id FROM public.profiles LIMIT 1)),
('', (SELECT id FROM public.clients WHERE email = 'sophie.petit@yahoo.fr' LIMIT 1), 'ouvert', NULL, (SELECT id FROM public.profiles LIMIT 1)),
('', (SELECT id FROM public.clients WHERE email = 'jean.dupont@email.fr' LIMIT 1), 'ferme', 'Deuxième passage — vente lingot 50g', (SELECT id FROM public.profiles LIMIT 1)),
('', (SELECT id FROM public.clients WHERE email = 'isabelle.roux@email.fr' LIMIT 1), 'ouvert', 'Estimation bracelet argent', (SELECT id FROM public.profiles LIMIT 1));
