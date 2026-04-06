-- ⚠️  DONNÉES DE TEST UNIQUEMENT — NE PAS EXÉCUTER EN PRODUCTION
-- Ce fichier contient des données fictives pour le développement local.
-- Seed data : clients de test pour Or au Juste Prix
INSERT INTO public.clients (civility, first_name, last_name, maiden_name, email, phone, address, city, postal_code, country, lead_source, notes) VALUES
('M', 'Jean', 'Dupont', NULL, 'jean.dupont@email.fr', '06 12 34 56 78', '12 rue de la Paix', 'Paris', '75002', 'France', 'Bouche à oreille', 'Client fidèle depuis 2022'),
('Mme', 'Marie', 'Martin', 'Leroy', 'marie.martin@gmail.com', '06 98 76 54 32', '45 avenue des Champs-Élysées', 'Paris', '75008', 'France', 'Google', 'Intéressée par les bijoux en or 750'),
('M', 'Pierre', 'Bernard', NULL, 'p.bernard@outlook.fr', '07 11 22 33 44', '8 place Bellecour', 'Lyon', '69002', 'France', 'Passage en boutique', NULL),
('Mme', 'Sophie', 'Petit', NULL, 'sophie.petit@yahoo.fr', '06 55 44 33 22', '23 rue du Vieux Port', 'Marseille', '13001', 'France', 'Réseaux sociaux', 'A acheté un bracelet en platine'),
('M', 'Lucas', 'Moreau', NULL, NULL, '06 77 88 99 00', '5 rue de la Liberté', 'Bordeaux', '33000', 'France', 'Recommandation', 'Recommandé par M. Dupont'),
('Mme', 'Isabelle', 'Roux', 'Garnier', 'isabelle.roux@email.fr', '06 33 22 11 00', '17 boulevard Haussmann', 'Paris', '75009', 'France', 'Publicité', NULL),
('M', 'Thomas', 'Fournier', NULL, 'thomas.f@gmail.com', '07 66 55 44 33', NULL, 'Toulouse', '31000', 'France', 'Google', 'Collectionneur de pièces en or'),
('Mme', 'Camille', 'Girard', NULL, NULL, '06 44 55 66 77', '3 rue Nationale', 'Lille', '59000', 'France', 'Passage en boutique', NULL),
('M', 'Antoine', 'Lefevre', NULL, 'a.lefevre@email.fr', '06 99 88 77 66', '29 quai des Chartrons', 'Bordeaux', '33000', 'France', 'Bouche à oreille', 'Achat régulier de lingots'),
('Mme', 'Nathalie', 'Garcia', 'Fernandez', 'n.garcia@hotmail.fr', '07 22 33 44 55', '11 rue de la République', 'Nice', '06000', 'France', 'Autre', 'Première visite le 15 mars 2026');

-- Seed data : pièces d'identité de test
-- On utilise des sous-requêtes pour récupérer les client_id
INSERT INTO public.client_identity_documents (client_id, document_type, document_number, issue_date, expiry_date, nationality, is_primary) VALUES
((SELECT id FROM public.clients WHERE email = 'jean.dupont@email.fr' LIMIT 1), 'cni', '0123456789012', '2020-03-15', '2030-03-15', 'Française', true),
((SELECT id FROM public.clients WHERE email = 'marie.martin@gmail.com' LIMIT 1), 'passeport', '20FR12345', '2021-07-20', '2031-07-20', 'Française', true),
((SELECT id FROM public.clients WHERE email = 'p.bernard@outlook.fr' LIMIT 1), 'permis_conduire', 'B1234567890', '2018-11-05', '2033-11-05', 'Française', true),
((SELECT id FROM public.clients WHERE email = 'sophie.petit@yahoo.fr' LIMIT 1), 'cni', '9876543210123', '2022-01-10', '2032-01-10', 'Française', true),
((SELECT id FROM public.clients WHERE email = 'isabelle.roux@email.fr' LIMIT 1), 'titre_sejour', 'TS20220456789', '2022-06-01', '2027-06-01', 'Italienne', true);
