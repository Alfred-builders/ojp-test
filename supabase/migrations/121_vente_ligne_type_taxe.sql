-- Ajouter le type de taxe sur les lignes de vente
-- tva_marge = TVA sur la marge (bijoux rachetés)
-- tfop = Taxe Forfaitaire Objets Précieux (bijoux dépôt-vente)
-- null = pas de taxe (or investissement)
ALTER TABLE vente_lignes
  ADD COLUMN type_taxe text CHECK (type_taxe IN ('tva_marge', 'tfop'));
