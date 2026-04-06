-- ============================================================
-- Migration 033: Email templates + logs pour Resend
-- ============================================================

-- Table des templates éditables
CREATE TABLE public.email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  category TEXT NOT NULL CHECK (category IN ('client', 'interne')),
  available_variables JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table de logs d'envoi
CREATE TABLE public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  resend_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  lot_id UUID REFERENCES public.lots(id),
  dossier_id UUID REFERENCES public.dossiers(id),
  client_id UUID REFERENCES public.clients(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX email_logs_lot_type_idx ON public.email_logs(lot_id, notification_type);
CREATE INDEX email_logs_created_at_idx ON public.email_logs(created_at DESC);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_templates" ON public.email_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_update_templates" ON public.email_templates
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_select_logs" ON public.email_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_logs" ON public.email_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Seed : templates par défaut
-- ============================================================

INSERT INTO public.email_templates (notification_type, label, subject, body, category, available_variables) VALUES

-- Client notifications
('devis_envoye', 'Devis envoyé', 'Votre devis {{devis_numero}} - Or au Juste Prix',
'Bonjour {{client_prenom}} {{client_nom}},

Veuillez trouver ci-joint votre devis n°{{devis_numero}} d''un montant de {{montant_total}} EUR.

Ce devis est valable 48 heures.

N''hésitez pas à nous contacter pour toute question.

Cordialement,
Or au Juste Prix', 'client',
'[{"key":"client_civilite","description":"Civilité (M. / Mme)"},{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"client_email","description":"Email du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"devis_numero","description":"Numéro du devis"},{"key":"montant_total","description":"Montant total du devis"},{"key":"date","description":"Date du jour"}]'),

('contrat_rachat_finalise', 'Contrat de rachat finalisé', 'Votre contrat de rachat {{contrat_numero}} - Or au Juste Prix',
'Bonjour {{client_prenom}} {{client_nom}},

Votre rachat a été finalisé. Veuillez trouver ci-joint :
- Votre contrat de rachat n°{{contrat_numero}}
- Votre quittance n°{{quittance_numero}}

Montant total : {{montant_total}} EUR.

Cordialement,
Or au Juste Prix', 'client',
'[{"key":"client_civilite","description":"Civilité (M. / Mme)"},{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"client_email","description":"Email du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"contrat_numero","description":"Numéro du contrat"},{"key":"quittance_numero","description":"Numéro de la quittance"},{"key":"montant_total","description":"Montant total"},{"key":"date","description":"Date du jour"}]'),

('contrat_depot_vente', 'Contrat de dépôt-vente', 'Votre contrat de dépôt-vente - Or au Juste Prix',
'Bonjour {{client_prenom}} {{client_nom}},

Veuillez trouver ci-joint votre contrat de dépôt-vente pour le dossier {{dossier_numero}}.

Vos articles sont désormais en dépôt-vente dans notre boutique.

Cordialement,
Or au Juste Prix', 'client',
'[{"key":"client_civilite","description":"Civilité (M. / Mme)"},{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"client_email","description":"Email du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"date","description":"Date du jour"}]'),

('facture_acompte', 'Facture d''acompte', 'Votre facture d''acompte {{facture_numero}} - Or au Juste Prix',
'Bonjour {{client_prenom}} {{client_nom}},

Veuillez trouver ci-joint votre facture d''acompte n°{{facture_numero}}.

Montant de l''acompte : {{montant_acompte}} EUR
Date limite de règlement du solde : {{date_limite_solde}}

Cordialement,
Or au Juste Prix', 'client',
'[{"key":"client_civilite","description":"Civilité (M. / Mme)"},{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"client_email","description":"Email du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"facture_numero","description":"Numéro de la facture"},{"key":"montant_acompte","description":"Montant de l''acompte"},{"key":"date_limite_solde","description":"Date limite du solde"},{"key":"date","description":"Date du jour"}]'),

('facture_vente', 'Facture de vente', 'Votre facture {{facture_numero}} - Or au Juste Prix',
'Bonjour {{client_prenom}} {{client_nom}},

Veuillez trouver ci-joint votre facture n°{{facture_numero}}.

Montant TTC : {{montant_ttc}} EUR
Mode de règlement : {{mode_reglement}}

Merci pour votre confiance.

Cordialement,
Or au Juste Prix', 'client',
'[{"key":"client_civilite","description":"Civilité (M. / Mme)"},{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"client_email","description":"Email du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"facture_numero","description":"Numéro de la facture"},{"key":"montant_ttc","description":"Montant TTC"},{"key":"mode_reglement","description":"Mode de règlement"},{"key":"date","description":"Date du jour"}]'),

('quittance_depot_vente', 'Quittance dépôt-vente', 'Votre article en dépôt-vente a été vendu - Or au Juste Prix',
'Bonjour {{client_prenom}} {{client_nom}},

Bonne nouvelle ! Votre article en dépôt-vente a été vendu.

Veuillez trouver ci-joint votre quittance n°{{quittance_numero}}.

Montant net à percevoir : {{montant_net}} EUR
Commission : {{montant_commission}} EUR

Cordialement,
Or au Juste Prix', 'client',
'[{"key":"client_civilite","description":"Civilité (M. / Mme)"},{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"client_email","description":"Email du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"quittance_numero","description":"Numéro de la quittance"},{"key":"montant_net","description":"Montant net à percevoir"},{"key":"montant_commission","description":"Montant de la commission"},{"key":"date","description":"Date du jour"}]'),

-- Internal notifications
('interne_devis_accepte', 'Devis accepté (interne)', '[OJP] Devis accepté - {{lot_numero}}',
'Le client {{client_prenom}} {{client_nom}} a accepté le devis du lot {{lot_numero}} (dossier {{dossier_numero}}).

La période de rétractation de 48h est en cours.

Montant : {{montant_total}} EUR', 'interne',
'[{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"montant_total","description":"Montant total"},{"key":"date","description":"Date du jour"}]'),

('interne_retractation', 'Rétractation client (interne)', '[OJP] Rétractation - {{lot_numero}}',
'Le client {{client_prenom}} {{client_nom}} s''est rétracté sur le lot {{lot_numero}} (dossier {{dossier_numero}}).

Le lot et ses références ont été remis à l''état initial.', 'interne',
'[{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"date","description":"Date du jour"}]'),

('interne_lot_finalisable', 'Lot finalisable (interne)', '[OJP] Lot finalisable - {{lot_numero}}',
'Le délai de rétractation du lot {{lot_numero}} (dossier {{dossier_numero}}) est expiré.

Client : {{client_prenom}} {{client_nom}}
Montant : {{montant_total}} EUR

Ce lot peut maintenant être finalisé.', 'interne',
'[{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"montant_total","description":"Montant total"},{"key":"date","description":"Date du jour"}]'),

('interne_acompte_expire', 'Acompte expiré (interne)', '[OJP] Acompte expiré - {{lot_numero}}',
'La date limite de règlement du solde pour le lot {{lot_numero}} (dossier {{dossier_numero}}) est dépassée.

Client : {{client_prenom}} {{client_nom}}
Montant acompte : {{montant_acompte}} EUR
Date limite : {{date_limite_solde}}

Action requise : vérifier le paiement ou annuler la vente.', 'interne',
'[{"key":"client_nom","description":"Nom du client"},{"key":"client_prenom","description":"Prénom du client"},{"key":"dossier_numero","description":"Numéro du dossier"},{"key":"lot_numero","description":"Numéro du lot"},{"key":"montant_acompte","description":"Montant de l''acompte"},{"key":"date_limite_solde","description":"Date limite du solde"},{"key":"date","description":"Date du jour"}]');
