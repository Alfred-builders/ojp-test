-- Settings key-value table for all configurable parameters
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to auto-update updated_at
CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update settings"
  ON settings FOR UPDATE TO authenticated
  USING (true);

-- Seed default values
INSERT INTO settings (key, value) VALUES
(
  'company',
  '{
    "nom": "L''Or au Juste Prix",
    "adresse": "4 Grande Rue",
    "code_postal": "74160",
    "ville": "St Julien en Genevois",
    "telephone": "06 78 87 75 78",
    "email": "",
    "forme_juridique": "SAS au capital de 5000.00€",
    "siret_rcs": "928 126 390 R.C.S. Thonon-les-Bains",
    "tribunal": "Thonon-les-Bains",
    "logo_url": "",
    "email_expediteur": "",
    "nom_expediteur": "Or au Juste Prix"
  }'::jsonb
),
(
  'business_rules',
  '{
    "retractation_heures": 48,
    "devis_validite_heures": 48,
    "acompte_pct": 10,
    "solde_pct": 90,
    "solde_delai_heures": 48,
    "commission_dv_pct": 40,
    "contrat_dv_duree_mois": 12,
    "preavis_resiliation_jours": 7,
    "penalite_retrait_pct": 10,
    "forfait_nettoyage": 20,
    "frais_garde_mois": 10,
    "delai_paiement_deposant_jours": 15,
    "seuil_alerte_identite_jours": 30
  }'::jsonb
),
(
  'document_prefixes',
  '{
    "quittance_rachat": "QRA",
    "contrat_rachat": "CRA",
    "devis_rachat": "DEV",
    "contrat_depot_vente": "CDV",
    "confie_achat": "CON",
    "quittance_depot_vente": "QDV",
    "facture_vente": "FVE",
    "facture_acompte": "FAC",
    "facture_solde": "FSO",
    "bon_commande": "CMDF"
  }'::jsonb
),
(
  'legal_texts',
  '{
    "conditions_confie": "Le vendeur déclare avoir atteint la majorité légale, être le propriétaire légitime des biens, agir à titre privé et que ces biens ne proviennent d''aucune activité illicite. La taxe sur les métaux précieux est acquittée par nos soins.",
    "conditions_achat": "Le vendeur déclare avoir atteint la majorité légale, être le propriétaire légitime des biens, agir à titre privé et que ces biens ne proviennent d''aucune activité illicite. La taxe sur les métaux précieux (11,5%) est acquittée par nos soins.",
    "conditions_contrat": "Si vous souhaitez exercer votre droit de rétractation dans les 48 heures à compter de la signature du contrat vous pouvez utiliser le formulaire détachable prévu à cet effet ou toute autre déclaration dénuée d''ambigüité exprimant votre volonté de vous rétracter conformément à l''article R224-4.\n\nConformément à l''article R.224-7, pour exercer son droit de rétractation prévu par l''article L.224-99, le consommateur-vendeur, sans avoir à justifier de motifs, remet au professionnel en main propre le formulaire détachable ou toute autre déclaration dénuée d''ambiguïté exprimant sa volonté de se rétracter, au plus tard 48H à compter du jour et de l''heure de la signature du contrat, ou toute autre moyen permettant d''attester de la date et l''heure d''envoi au plus tard 48h à compter du jour et de l''heure de la signature du contrat. Si le délai expire un samedi, un dimanche, un jour chômé ou un jour férié, il est prorogé jusqu''au premier jour ouvrable suivant à la même heure. L''envoi ou la remise du formulaire au professionnel et dans le délai imparti a pour effet d''annuler l''opération d''achat. A défaut le contrat est conclu définitivement.\n\nRappel : Conformément au 2eme alinéa de l''article L.224-9, l''exercice du droit de rétractation met fin aux obligations des parties. Le consommateur doit alors rembourser au professionnel le prix perçu, et, en contrepartie, ce dernier doit lui restituer le ou les objets achetés. A défaut de restituer le ou les objets achetés, le professionnel verse au consommateur une somme équivalente au double prix de vente perçu pour le bien ou les objets achetés. Conformément au troisième alinéa du même article, le consommateur-vendeur ne dispose pas d''un droit de rétractation pour les opérations d''or d''investissement.",
    "devis_validite": "Ce devis est valable 48 heures à compter de sa date d''émission. Passé ce délai, les prix pourront être révisés en fonction du cours des métaux précieux. Les prix indiqués sont basés sur les cours en vigueur au moment de l''établissement du devis.",
    "conditions_quittance_dv": "Ce document atteste du règlement des sommes dues au déposant-vendeur suite à la vente des articles ci-dessus, conformément au contrat de dépôt-vente en vigueur. La commission du dépositaire a été déduite du montant brut conformément aux conditions contractuelles.",
    "cgv_vente": "La TVA n''est pas applicable pour des achats ou vente d''or d''investissement.\n1) Exonération suivant l''article 298 sexdecies A du CGI. AUTOLIQUIDATION TVA\n2) Opération bénéficiant du régime de l''autoliquidation prévue à l''article 283-2 sexis du CGI.",
    "cgv_acompte": "Facture d''acompte de 10% sur commande d''or d''investissement. Le solde de 90% est exigible sous 48 heures à compter de la date de la présente facture. À défaut de règlement dans ce délai, la commande sera automatiquement annulée et l''acompte restera acquis.\n\nLa TVA n''est pas applicable pour des achats ou vente d''or d''investissement.\n1) Exonération suivant l''article 298 sexdecies A du CGI. AUTOLIQUIDATION TVA\n2) Opération bénéficiant du régime de l''autoliquidation prévue à l''article 283-2 sexis du CGI.",
    "conditions_bon_commande": "Ce bon de commande est émis par L''Or au Juste Prix pour l''achat d''or d''investissement. Les prix sont basés sur les cours en vigueur au moment de l''établissement de la commande. Merci de confirmer la réception de cette commande par retour.",
    "cdv_clauses": [
      {"title": "OBJET DU CONTRAT", "body": "Le présent contrat est établi à l''occasion du dépôt de marchandises appartenant au déposant-vendeur dans le local commercial du dépositaire. A charge pour ce dernier de les vendre en son nom et pour son compte contre une rémunération de ses services d''intermédiaire.\n\nSi le dépositaire-vendeur devait déposer de nouveaux objets, ces derniers feraient alors l''objet d''un nouveau contrat."},
      {"title": "DESCRIPTION DES MARCHANDISES", "body": "Les marchandises faisant l''objet du contrat sont détaillées dans la fiche de dépôt ci-jointe."},
      {"title": "DURÉE DU CONTRAT", "body": "Le présent contrat est conclu pour la durée de 1 (un) an à compter de la date de signature. Il peut être résilié à tout moment, par l''une ou l''autre des parties, à charge pour la partie qui prendra l''initiative de la rupture de la notifier par lettre recommandée avec AR avec préavis de 7 jours calendaires.\n\nEn cas de résiliation à l''initiative du déposant-vendeur, ce dernier s''engage à retirer ses biens dans un délai de 15 jours à compter de la réception de la notification. Une indemnité forfaitaire de 10 % du prix de vente public TTC sera alors due par le déposant-vendeur."},
      {"title": "PRIX DE VENTE", "body": "Le prix de vente des articles au client final est fixé d''un commun accord. Il est mentionné pour chaque article sur la fiche de dépôt annexée. Le prix de vente est entendu TTC."},
      {"title": "CONDITIONS DE VENTE", "body": "Le dépositaire se réserve le droit de refuser des articles. Il s''engage à exposer les objets (vitrines, site internet). En cas de vente à distance, il gère l''expédition. La SAS L''Or au Juste Prix agit en qualité d''intermédiaire."},
      {"title": "RÉPARATIONS ET NETTOYAGE", "body": "Si les objets ne sont pas propres, un forfait de 20 euros TTC par objet sera facturé. Les réparations éventuelles seront déduites du prix final ou facturées au réel si l''objet n''est pas vendu."},
      {"title": "RÉMUNÉRATION DU DÉPOSITAIRE", "body": "La commission du dépositaire s''élève à 40 % du prix de vente public."},
      {"title": "SOLDES ET PROMOTIONS", "body": "Le dépositaire peut réaliser des soldes (-20% à -50%) ou promotions (-10% à -30%) selon les périodes, sans préavis systématique au déposant."},
      {"title": "ASSURANCES", "body": "En cas de vol, casse ou incendie, le dépositaire rembourse le montant « prix de vente demandé » indiqué sur la fiche."},
      {"title": "PAIEMENT ET RESTITUTION", "body": "Règlement sous 15 jours. En fin de contrat, les invendus non réclamés après 1 an et 1 jour suivant notification pourront être cédés, détruits ou conservés (frais de garde : 10 € TTC/mois)."},
      {"title": "LITIGES", "body": "Tribunal compétent : Thonon-les-Bains. Droit français applicable. En signant, le déposant accepte toutes les conditions."}
    ]
  }'::jsonb
),
(
  'pdf_style',
  '{
    "color_primary": "#C8A84E",
    "font_family": "Courier"
  }'::jsonb
),
(
  'notifications',
  '{
    "types": {
      "dossier_created": true,
      "dossier_finalized": true,
      "lot_accepted": true,
      "lot_finalized": true,
      "lot_retracted": true,
      "vente_created": true,
      "vente_finalized": true,
      "vente_livree": true,
      "commande_received": true,
      "client_created": true,
      "system": true
    },
    "cron_lots_finalisables": "1h",
    "cron_acompte_expire": "15min",
    "emails_internes": []
  }'::jsonb
),
(
  'appearance',
  '{
    "sidebar_default_open": false,
    "items_per_page": 20
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
