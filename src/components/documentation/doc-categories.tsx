import {
  UsersThree,
  ShoppingCart,
  HandCoins,
  Storefront,
  ClipboardText,
  Diamond,
  Coins,
  Gear,
  FileText,
  EnvelopeSimple,
  UserPlus,
  FolderPlus,
  Package,
  Plus,
  CheckCircle,
  XCircle,
  FloppyDisk,
  Info,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppLink } from "./doc-app-link";

export interface DocStep {
  id: string;
  label: string;
  content: React.ReactNode;
  note?: React.ReactNode;
}

export interface DocSection {
  id: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  content: React.ReactNode;
  steps?: DocStep[];
}

export interface DocCategory {
  label: string;
  sections: DocSection[];
}

export const categories: DocCategory[] = [
  {
    label: "Procédures",
    sections: [
      {
        id: "proc-client",
        title: "Ajouter un client",
        icon: UserPlus,
        content: (
          <div className="space-y-4">
            <p>Procédure pour créer un nouveau client et configurer sa pièce d&apos;identité.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/docs/client-fiche.png" alt="Liste des clients" className="rounded-lg border shadow-sm" />
          </div>
        ),
        steps: [
          {
            id: "client-1",
            label: "Créer le client",
            content: (
              <div className="space-y-3">
                <p>Depuis le <AppLink href="/dashboard">dashboard</AppLink> ou la <AppLink href="/clients">liste Clients</AppLink>, cliquer sur <Button variant="secondary" size="sm" className="cursor-default"><Plus size={14} weight="bold" />Nouveau client</Button></p>
                <p>Le formulaire de création s&apos;ouvre avec <strong>3 cartes</strong> à remplir :</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 font-medium">
                        <UsersThree size={16} weight="duotone" />
                        Informations personnelles
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li><strong>Civilité *</strong> — Monsieur ou Madame</li>
                        <li><strong>Prénom *</strong></li>
                        <li><strong>Nom *</strong></li>
                        <li>Nom de jeune fille</li>
                        <li>Email, Téléphone</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 font-medium">
                        <Package size={16} weight="duotone" />
                        Adresse
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>Adresse</li>
                        <li>Code postal</li>
                        <li>Ville</li>
                        <li>Pays (défaut : France)</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 font-medium">
                        <Info size={16} weight="duotone" />
                        Informations complémentaires
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>Source du contact</li>
                        <li>Notes libres</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                <p>Remplir au minimum les champs marqués d&apos;un <strong>*</strong>, puis cliquer sur <Button size="sm" className="cursor-default"><FloppyDisk size={14} weight="duotone" />Créer</Button></p>
                <p>Vous êtes redirigé vers la fiche du client nouvellement créé.</p>
              </div>
            ),
          },
          {
            id: "client-2",
            label: "Ajouter une pièce d'identité",
            content: (
              <div className="space-y-3">
                <p>Sur la fiche client, dans la carte <strong>Pièces d&apos;identité</strong>, cliquer sur <Button variant="outline" size="sm" className="cursor-default"><Plus size={14} weight="bold" />Ajouter un document</Button></p>
                <p>Un formulaire inline s&apos;ouvre avec les champs suivants :</p>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  <li><strong>Type de document *</strong> — CNI, Passeport, Titre de séjour ou Permis de conduire</li>
                  <li><strong>Numéro *</strong> — Le numéro du document</li>
                  <li><strong>Date d&apos;émission</strong> — Via le sélecteur de date</li>
                  <li><strong>Date d&apos;expiration</strong> — Via le sélecteur de date</li>
                  <li><strong>Nationalité</strong> — Pré-rempli &quot;Française&quot;</li>
                  <li><strong>Photo du document</strong> — Zone de dépôt pour ajouter une photo (optionnel)</li>
                </ul>
                <p>Cliquer sur <Button size="sm" className="cursor-default"><Plus size={14} weight="bold" />Ajouter</Button></p>
                <p>Le premier document ajouté est automatiquement marqué comme <Badge variant="secondary" className="text-xs">Principal</Badge>.</p>
              </div>
            ),
          },
          {
            id: "client-3",
            label: "Gérer les documents",
            content: (
              <div className="space-y-3">
                <p>Chaque pièce d&apos;identité dispose d&apos;un menu accessible via le bouton <strong>3 points</strong> :</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li><strong>Voir la pièce</strong> — Ouvre un visualiseur avec la photo du document (si une photo a été ajoutée)</li>
                  <li><strong>Modifier</strong> — Réouvre le formulaire d&apos;édition inline avec les valeurs actuelles pré-remplies</li>
                  <li><strong>Supprimer</strong> — Affiche une barre de confirmation avant suppression définitive</li>
                </ul>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-amber-50 shadow-sm ring-1 ring-amber-200 dark:bg-amber-900/10 dark:ring-amber-800/50">
                <div className="flex items-center gap-2 border-b border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-800 dark:border-amber-800/50 dark:text-amber-300">
                  <Warning size={16} weight="duotone" className="shrink-0" />
                  Validité du client
                </div>
                <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  Un client est considéré &quot;Valide&quot; uniquement s&apos;il possède
                  une pièce d&apos;identité principale avec une date d&apos;expiration <strong>non dépassée</strong>.
                  Sans cela, il ne peut pas être sélectionné lors de la création d&apos;un dossier.
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "proc-dossier",
        title: "Créer un dossier",
        icon: FolderPlus,
        content: (
          <div className="space-y-4">
            <p>Procédure pour créer un dossier et y rattacher des opérations (lots).</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/docs/dossier-nouveau-lot.png" alt="Liste des dossiers" className="rounded-lg border shadow-sm" />
          </div>
        ),
        steps: [
          {
            id: "dossier-1",
            label: "Créer le dossier",
            content: (
              <div className="space-y-3">
                <p>Depuis le <AppLink href="/dashboard">dashboard</AppLink> ou la <AppLink href="/dossiers">liste Dossiers</AppLink>, cliquer sur <Button size="sm" className="cursor-default"><FolderPlus size={14} weight="duotone" />Nouveau dossier</Button></p>
                <p>Le formulaire de création contient :</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li><strong>Numéro</strong> — Généré automatiquement au format <code>DOS-YYYY-NNNN</code></li>
                  <li><strong>Client *</strong> — Sélectionner un client dans la liste déroulante</li>
                  <li><strong>Notes</strong> — Zone de texte libre (optionnel)</li>
                </ul>
                <p>Cliquer sur <Button size="sm" className="cursor-default"><FloppyDisk size={14} weight="duotone" />Créer</Button></p>
                <p>
                  Le dossier est créé au statut <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Brouillon</Badge> et
                  vous êtes redirigé vers la fiche dossier.
                </p>
              </div>
            ),
          },
          {
            id: "dossier-2",
            label: "Ajouter des lots",
            content: (
              <div className="space-y-3">
                <p>Sur la fiche dossier, dans la section des lots, cliquer sur <Button variant="secondary" size="sm" className="cursor-default"><Plus size={14} weight="bold" />Nouveau lot</Button></p>
                <p>Un menu déroulant propose trois types de lots :</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <p className="flex items-center gap-2 font-medium">
                        <ShoppingCart size={16} weight="duotone" />
                        Rachat
                      </p>
                      <p className="text-xs text-muted-foreground">Acheter des bijoux ou de l&apos;or au client</p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <p className="flex items-center gap-2 font-medium">
                        <Storefront size={16} weight="duotone" />
                        Vente
                      </p>
                      <p className="text-xs text-muted-foreground">Vendre des articles au client</p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <p className="flex items-center gap-2 font-medium">
                        <HandCoins size={16} weight="duotone" />
                        Dépôt-vente
                      </p>
                      <p className="text-xs text-muted-foreground">Le client dépose des articles à vendre</p>
                    </CardContent>
                  </Card>
                </div>
                <p>
                  Le lot est créé au statut <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Brouillon</Badge> avec
                  un snapshot des cours actuels, et vous êtes redirigé vers la fiche du lot.
                </p>
              </div>
            ),
          },
          {
            id: "dossier-3",
            label: "Finaliser le dossier",
            content: (
              <div className="space-y-3">
                <p>Quand des lots brouillon sont prêts à être validés, cliquer sur <Button size="sm" className="cursor-default"><CheckCircle size={16} weight="duotone" />Finaliser le dossier</Button></p>
                <p>Cette action traite tous les lots brouillon du dossier :</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li><strong>Lots rachat (direct)</strong> — Les références passent en rétractation (48h)</li>
                  <li><strong>Lots rachat (devis)</strong> — Le devis est envoyé, en attente de réponse</li>
                  <li><strong>Lots dépôt-vente</strong> — Les articles passent directement en stock dépôt-vente</li>
                  <li><strong>Lots vente</strong> — Le lot passe en cours : une facture bijoux et/ou une facture d&apos;acompte (10%) pour l&apos;or investissement sont générées automatiquement</li>
                </ul>
                <p>Les documents correspondants (contrats, quittances, devis, factures) sont générés automatiquement.</p>
                <p>
                  Le dossier passe au statut <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">En cours</Badge>.
                  Il passera automatiquement en <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Finalisé</Badge> quand
                  tous les lots seront terminés.
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "proc-rachat",
        title: "Effectuer un rachat",
        icon: ShoppingCart,
        content: (
          <div className="space-y-4">
            <p>Procédure complète pour racheter des bijoux ou de l&apos;or investissement auprès d&apos;un client.</p>
          </div>
        ),
        steps: [
          {
            id: "rachat-1",
            label: "Créer le lot de rachat",
            content: (
              <div className="space-y-3">
                <p>Depuis la fiche dossier, cliquer sur <Button variant="secondary" size="sm" className="cursor-default"><Plus size={14} weight="bold" />Nouveau lot</Button> puis sélectionner <Button variant="outline" size="sm" className="cursor-default"><ShoppingCart size={14} weight="duotone" />Rachat</Button></p>
                <p>
                  Un lot est créé au statut <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Brouillon</Badge> avec
                  un numéro au format <code>RAC-YYYY-NNNN</code>.
                  Les cours des métaux et le coefficient de rachat sont figés à cet instant (ils ne changeront pas même si les paramètres sont modifiés ensuite).
                </p>
              </div>
            ),
          },
          {
            id: "rachat-2",
            label: "Ajouter les références",
            content: (
              <div className="space-y-4">
                <p>Dans le header de la fiche lot, cliquer sur <Button variant="secondary" size="sm" className="cursor-default"><Plus size={14} weight="bold" />Référence</Button></p>
                <p>Deux types de références sont disponibles :</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 font-medium">
                        <Diamond size={16} weight="duotone" />
                        Bijoux
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li><strong>Désignation</strong> — Nom de l&apos;article</li>
                        <li><strong>Métal</strong> — Or, Argent ou Platine</li>
                        <li><strong>Qualité</strong> — 333, 375, 585, 750 ou 999</li>
                        <li><strong>Poids</strong> — En grammes</li>
                        <li><strong>Quantité</strong></li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 font-medium">
                        <Coins size={16} weight="duotone" />
                        Or investissement
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li><strong>Pièce/Lingot</strong> — Recherche dans le catalogue</li>
                        <li><strong>Quantité</strong></li>
                        <li><strong>Facture au nom du client</strong> (optionnel)</li>
                        <li><strong>Pièce sous scellés</strong> (optionnel)</li>
                        <li><strong>Date et prix d&apos;acquisition</strong> (pour le régime fiscal)</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                <p>Pour chaque référence, choisir le <strong>type de rachat</strong> : <Button variant="outline" size="sm" className="cursor-default">⚡ Direct</Button> ou <Button variant="outline" size="sm" className="cursor-default"><FileText size={14} weight="duotone" />Devis</Button></p>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  <li><strong>Direct</strong> — Le prix est accepté immédiatement, passage en rétractation après finalisation du dossier</li>
                  <li><strong>Devis</strong> — Un devis est envoyé au client qui a 48h pour accepter ou refuser</li>
                </ul>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800/50">
                <div className="flex items-center gap-2 border-b border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-800 dark:border-blue-800/50 dark:text-blue-300">
                  <Info size={16} weight="duotone" className="shrink-0" />
                  Calcul du prix
                </div>
                <p className="px-4 py-3 text-sm text-blue-700 dark:text-blue-400">Le prix de rachat est calculé automatiquement : <code>poids × cours du métal × coefficient de rachat</code>. Il est modifiable manuellement si besoin.</p>
              </div>
            ),
          },
          {
            id: "rachat-3",
            label: "Enregistrer et finaliser",
            content: (
              <div className="space-y-3">
                <p>Une fois les références ajoutées, enregistrer le lot avec <Button size="sm" className="cursor-default"><FloppyDisk size={14} weight="duotone" />Enregistrer</Button></p>
                <p>Puis, depuis la fiche dossier, finaliser avec <Button size="sm" className="cursor-default"><CheckCircle size={16} weight="duotone" />Finaliser le dossier</Button></p>
                <p>Selon le type de rachat :</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li><strong>Direct (bijoux)</strong> — Les références passent en <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">En rétractation</Badge> (48h). Un <strong>contrat de rachat</strong> est généré</li>
                  <li><strong>Direct (or investissement)</strong> — Finalisé immédiatement, stock incrémenté. Une <strong>quittance de rachat</strong> est générée</li>
                  <li><strong>Devis</strong> — Les références passent en <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Devis envoyé</Badge>. Un <strong>devis de rachat</strong> est généré</li>
                </ul>
              </div>
            ),
          },
          {
            id: "rachat-4",
            label: "Période de rétractation",
            content: (
              <div className="space-y-3">
                <p>
                  Après acceptation (directe ou devis accepté), un délai de <strong>48 heures</strong> démarre.
                  Une <strong>card dédiée</strong> apparait sur la fiche lot avec une barre de progression, un compte à rebours et les boutons d&apos;action.
                </p>
                <p>Pendant ce délai, deux actions sont disponibles dans la card de rétractation :</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="font-medium">Attendre la fin du délai</p>
                      <p className="text-xs text-muted-foreground">
                        Le bouton <Button size="sm" className="pointer-events-none opacity-50">Finaliser le rachat</Button> reste grisé tant que les 48h ne sont pas écoulées.
                        La barre de progression et le timer se mettent à jour en temps réel.
                      </p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="font-medium">Le client se rétracte</p>
                      <p className="text-xs text-muted-foreground">
                        Cliquer sur <Button variant="destructive" size="sm" className="cursor-default">Client se rétracte</Button> pour annuler le rachat.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-amber-50 shadow-sm ring-1 ring-amber-200 dark:bg-amber-900/10 dark:ring-amber-800/50">
                <div className="flex items-center gap-2 border-b border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-800 dark:border-amber-800/50 dark:text-amber-300">
                  <Warning size={16} weight="duotone" className="shrink-0" />
                  Rétractation
                </div>
                <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-400">Si le client se rétracte, toutes les références du lot passent en statut <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rétracté</Badge>. Aucun stock n&apos;est créé. <strong>Cette action est irréversible.</strong></p>
              </div>
            ),
          },
          {
            id: "rachat-5",
            label: "Finaliser le rachat",
            content: (
              <div className="space-y-3">
                <p>Quand le délai de 48h est expiré, cliquer sur <Button size="sm" className="cursor-default">Finaliser</Button></p>
                <p>Le système effectue automatiquement :</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li>Création d&apos;une entrée dans le <AppLink href="/stock">stock bijoux</AppLink> pour chaque référence bijoux (statut <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">En stock</Badge>)</li>
                  <li>Incrémentation de la <strong>quantité</strong> dans le catalogue pour l&apos;or investissement</li>
                  <li>Génération d&apos;une <strong>quittance de rachat</strong> (PDF) récapitulant les articles, montants et taxes</li>
                  <li>Passage du lot en statut <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Finalisé</Badge></li>
                </ul>
                <p>Les documents générés sont consultables directement dans le visualiseur PDF intégré depuis la fiche lot.</p>
                <p>La carte <strong>Règlements</strong> apparait avec le montant à verser au client. Cliquer sur <Button size="sm" className="cursor-default"><Plus size={14} weight="bold" />Régler</Button> pour enregistrer le paiement (montant, mode, date).</p>
              </div>
            ),
          },
          {
            id: "rachat-6",
            label: "Répondre à un devis",
            content: (
              <div className="space-y-3">
                <p>Si des références sont de type <strong>Devis</strong>, elles passent en <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Devis envoyé</Badge> après finalisation du dossier.</p>
                <p>Dans le tableau <strong>Documents</strong>, sur la ligne du devis, deux boutons apparaissent : <Button size="sm" className="cursor-default"><CheckCircle size={14} weight="duotone" />Accepter</Button> et <Button variant="destructive" size="sm" className="cursor-default"><XCircle size={14} weight="duotone" />Refuser</Button></p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li><strong>Accepté (bijoux)</strong> — La référence passe en rétractation (nouveau délai de 48h)</li>
                  <li><strong>Accepté (or investissement)</strong> — Finalisé immédiatement, stock incrémenté</li>
                  <li><strong>Refusé</strong> — La référence passe en <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Devis refusé</Badge> (terminal)</li>
                </ul>
              </div>
            ),
          },
        ],
      },
      {
        id: "proc-vente",
        title: "Réaliser une vente",
        icon: Storefront,
        content: (
          <div className="space-y-4">
            <p>Procédure complète pour vendre des bijoux ou de l&apos;or investissement à un client.</p>
          </div>
        ),
        steps: [
          {
            id: "vente-1",
            label: "Créer le lot de vente",
            content: (
              <div className="space-y-3">
                <p>Ouvrir la fiche du dossier client, cliquer sur <Button variant="secondary" size="sm" className="cursor-default"><Plus size={14} weight="bold" />Nouveau lot</Button> puis sélectionner <Button variant="outline" size="sm" className="cursor-default"><Storefront size={14} weight="duotone" />Vente</Button></p>
                <p>
                  Un lot est créé au statut <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Brouillon</Badge> et
                  vous êtes redirigé vers la fiche vente.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/docs/dossier-nouveau-lot.png" alt="Fiche dossier avec le menu Nouveau lot" className="rounded-lg border shadow-sm" />
              </div>
            ),
          },
          {
            id: "vente-2",
            label: "Ajouter les articles",
            content: (
              <div className="space-y-4">
                <p>Dans le header de la fiche vente, cliquer sur <Button variant="secondary" size="sm" className="cursor-default"><Plus size={14} weight="bold" />Référence</Button></p>
                <p>Un menu déroulant propose deux options :</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 font-medium">
                        <Diamond size={16} weight="duotone" />
                        Bijoux
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rechercher et sélectionner un article disponible dans le <AppLink href="/stock">stock bijoux</AppLink>.
                        Le prix de revente et les caractéristiques sont pré-remplis automatiquement.
                      </p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 font-medium">
                        <Coins size={16} weight="duotone" />
                        Or investissement
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rechercher un produit dans le catalogue, renseigner la quantité souhaitée.
                        Le prix est calculé selon le cours du métal et le coefficient de vente.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800/50">
                <div className="flex items-center gap-2 border-b border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-800 dark:border-blue-800/50 dark:text-blue-300">
                  <Info size={16} weight="duotone" className="shrink-0" />
                  Stock
                </div>
                <p className="px-4 py-3 text-sm text-blue-700 dark:text-blue-400">Les bijoux ajoutés passent automatiquement en statut &quot;En vente&quot; et ne sont plus disponibles pour d&apos;autres ventes.</p>
              </div>
            ),
          },
          {
            id: "vente-3",
            label: "Passage en cours (automatique)",
            content: (
              <div className="space-y-3">
                <p>Le passage en cours est <strong>automatique</strong> lors de la finalisation du dossier. Il n&apos;y a plus de bouton à cliquer.</p>
                <p>Le lot passe au statut <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">En cours</Badge> et les documents sont générés automatiquement :</p>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  <li><strong>Bijoux</strong> — Une facture de vente est générée</li>
                  <li><strong>Or investissement</strong> — Une facture d&apos;acompte (10%) est générée</li>
                </ul>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-amber-50 shadow-sm ring-1 ring-amber-200 dark:bg-amber-900/10 dark:ring-amber-800/50">
                <div className="flex items-center gap-2 border-b border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-800 dark:border-amber-800/50 dark:text-amber-300">
                  <Warning size={16} weight="duotone" className="shrink-0" />
                  Or investissement
                </div>
                <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-400">La carte <strong>Règlements</strong> affiche le montant de l&apos;acompte à encaisser. Le client dispose de <strong>48h</strong> pour régler les 90% restants. Les délais sont visibles sur la fiche vente et le <AppLink href="/dashboard">dashboard</AppLink>.</p>
              </div>
            ),
          },
          {
            id: "vente-4",
            label: "Livrer les articles",
            content: (
              <div className="space-y-3">
                <p>Pour les <strong>bijoux</strong>, sur chaque carte article cliquer sur <Button variant="outline" size="sm" className="cursor-default"><Package size={14} weight="duotone" />Marquer livré</Button> pour confirmer la remise au client.</p>
                <p>Pour l&apos;<strong>or investissement</strong>, gérer d&apos;abord l&apos;approvisionnement directement sur la fiche vente :</p>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  <li>Si le stock est suffisant, cliquer sur <Button variant="outline" size="sm" className="cursor-default"><Package size={14} weight="duotone" />Servir depuis stock</Button></li>
                  <li>Sinon, marquer comme <Button variant="outline" size="sm" className="cursor-default"><ShoppingCart size={14} weight="duotone" />À commander</Button> puis <Button variant="outline" size="sm" className="cursor-default"><CheckCircle size={14} weight="duotone" />Marquer reçu</Button> à la réception</li>
                </ul>
                <p>Une fois tous les articles reçus et livrés, le bouton de finalisation devient actif.</p>
              </div>
            ),
          },
          {
            id: "vente-5",
            label: "Enregistrer les règlements",
            content: (
              <div className="space-y-4">
                <p>La carte <strong>Règlements</strong> en bas de la fiche vente indique les paiements à enregistrer :</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li><strong>Vente bijoux</strong> — Un règlement pour le montant total TTC</li>
                  <li><strong>Or investissement</strong> — Acompte de 10% (au passage en cours), puis solde de 90%</li>
                </ul>
                <p>Pour chaque paiement en attente, cliquer sur <Button size="sm" className="cursor-default"><Plus size={14} weight="bold" />Régler</Button>. Le formulaire est pré-rempli avec le montant attendu. Choisir le mode de règlement (espèces, carte, virement, chèque) et la date.</p>
                <p>Les règlements sont visibles depuis la fiche du <AppLink href="/dossiers">dossier</AppLink> et les délais de paiement apparaissent dans les alertes du <AppLink href="/dashboard">dashboard</AppLink>.</p>
              </div>
            ),
          },
          {
            id: "vente-5b",
            label: "Terminer la vente",
            content: (
              <div className="space-y-4">
                <p>Quand tous les articles sont livrés, une <strong>card verte</strong> apparait sous les articles avec le bouton <Button size="sm" className="cursor-default"><CheckCircle size={16} weight="duotone" />Terminer la vente</Button></p>
                <p>Après confirmation :</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li>Les bijoux vendus passent en statut <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Vendu</Badge> dans le stock</li>
                  <li>Si des articles provenaient d&apos;un <strong>dépôt-vente</strong>, une quittance est générée pour le déposant</li>
                  <li>Les factures de vente sont générées automatiquement</li>
                  <li>Le lot passe au statut <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Terminé</Badge></li>
                </ul>
              </div>
            ),
          },
          {
            id: "vente-6",
            label: "Annuler une vente",
            content: (
              <div className="space-y-3">
                <p>À tout moment pendant le statut <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">En cours</Badge>, un lien discret <span className="text-destructive font-medium">Annuler la vente</span> est disponible en bas de page.</p>
                <p>Une confirmation est demandée. Les bijoux sont remis en stock avec leur statut d&apos;origine (en stock ou en dépôt-vente). <strong>Cette action est irréversible.</strong></p>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800/50">
                <div className="flex items-center gap-2 border-b border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-800 dark:border-blue-800/50 dark:text-blue-300">
                  <Info size={16} weight="duotone" className="shrink-0" />
                  Suivi de commande
                </div>
                <p className="px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
                  L&apos;approvisionnement et la livraison de l&apos;or investissement se gèrent directement sur la fiche vente.
                  Un stepper en haut de page permet de suivre la progression globale du lot.
                  La page <AppLink href="/fonderie/routage">Commandes</AppLink> offre une vue d&apos;ensemble de toutes les commandes en cours.
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "proc-bdc",
        title: "Bons de commande",
        icon: ClipboardText,
        content: (
          <div className="space-y-4">
            <p>Gestion des commandes fournisseur pour l&apos;or investissement. Les bons de commande regroupent les lignes à commander par fonderie et permettent de suivre le paiement.</p>
          </div>
        ),
        steps: [
          {
            id: "bdc-1",
            label: "Router les lignes",
            content: (
              <div className="space-y-3">
                <p>Depuis la page <AppLink href="/fonderie/routage">Commandes</AppLink>, l&apos;onglet <strong>À commander</strong> liste toutes les lignes or investissement en attente.</p>
                <p>Pour chaque ligne, choisir la destination :</p>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  <li><strong>Stock</strong> — Servir depuis le stock existant (si quantité disponible)</li>
                  <li><strong>Fonderie</strong> — Sélectionner la fonderie dans le menu déroulant</li>
                </ul>
              </div>
            ),
          },
          {
            id: "bdc-2",
            label: "Générer les bons de commande",
            content: (
              <div className="space-y-3">
                <p>Une fois les fonderies assignées, cliquer sur <Button size="sm" className="cursor-default"><FileText size={14} weight="duotone" />Générer les bons de commande</Button></p>
                <p>Le système crée un bon par fonderie avec un numéro au format <code>BDC-YYYY-NNNN</code>. Un PDF est généré automatiquement.</p>
              </div>
            ),
          },
          {
            id: "bdc-3",
            label: "Suivre et réceptionner",
            content: (
              <div className="space-y-3">
                <p>Dans l&apos;onglet <strong>Bons de commande</strong>, chaque bon affiche son statut, ses lignes et le montant total.</p>
                <p>Actions disponibles :</p>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  <li><Button variant="secondary" size="sm" className="cursor-default"><Package size={14} weight="duotone" />Marquer envoyé</Button> — Le bon passe en statut Envoyé</li>
                  <li><Button variant="secondary" size="sm" className="cursor-default"><CheckCircle size={14} weight="duotone" />Marquer reçu</Button> — Les lignes passent en &quot;Reçu&quot; et peuvent être livrées au client</li>
                </ul>
              </div>
            ),
          },
          {
            id: "bdc-4",
            label: "Payer la fonderie",
            content: (
              <div className="space-y-3">
                <p>Sur chaque bon de commande, un bouton <Button size="sm" className="cursor-default"><Plus size={14} weight="bold" />Régler</Button> permet d&apos;enregistrer le règlement à la fonderie.</p>
                <p>Le formulaire est pré-rempli avec le montant total du bon. Choisir le mode de règlement et la date. Le bon passe automatiquement en statut <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Payé</Badge> une fois le montant total couvert.</p>
              </div>
            ),
          },
        ],
      },
      {
        id: "proc-depot",
        title: "Créer un dépôt-vente",
        icon: HandCoins,
        content: (
          <div className="space-y-4">
            <p>Procédure pour qu&apos;un client dépose des bijoux à vendre en boutique. L&apos;article reste sa propriété jusqu&apos;à la vente.</p>
          </div>
        ),
        steps: [
          {
            id: "depot-1",
            label: "Créer le lot",
            content: (
              <div className="space-y-3">
                <p>Depuis la fiche dossier, cliquer sur <Button variant="secondary" size="sm" className="cursor-default"><Plus size={14} weight="bold" />Nouveau lot</Button> puis sélectionner <Button variant="outline" size="sm" className="cursor-default"><HandCoins size={14} weight="duotone" />Dépôt-vente</Button></p>
                <p>
                  Un lot est créé au statut <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Brouillon</Badge> avec
                  un numéro au format <code>DPV-YYYY-NNNN</code>.
                </p>
              </div>
            ),
          },
          {
            id: "depot-2",
            label: "Ajouter les articles",
            content: (
              <div className="space-y-4">
                <p>Cliquer sur <Button variant="secondary" size="sm" className="cursor-default"><Plus size={14} weight="bold" />Référence</Button></p>
                <p>Seules les <strong>références bijoux</strong> sont disponibles pour le dépôt-vente (pas d&apos;or investissement).</p>
                <Card size="sm">
                  <CardContent className="space-y-2">
                    <p className="flex items-center gap-2 font-medium">
                      <Diamond size={16} weight="duotone" />
                      Formulaire bijoux (dépôt-vente)
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li><strong>Désignation, Métal, Qualité, Poids, Quantité</strong> — Identique au rachat</li>
                      <li><strong>Prix d&apos;achat</strong> — Ce que le déposant recevra si l&apos;article est vendu</li>
                      <li><strong>Prix de revente</strong> — Calculé automatiquement : prix d&apos;achat × 1.4</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800/50">
                <div className="flex items-center gap-2 border-b border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-800 dark:border-blue-800/50 dark:text-blue-300">
                  <Info size={16} weight="duotone" className="shrink-0" />
                  Commission
                </div>
                <p className="px-4 py-3 text-sm text-blue-700 dark:text-blue-400">La <strong>commission de 40%</strong> est appliquée automatiquement. Le prix de revente en boutique est toujours 1.4× le prix versé au déposant.</p>
              </div>
            ),
          },
          {
            id: "depot-3",
            label: "Finaliser le dépôt",
            content: (
              <div className="space-y-3">
                <p>Enregistrer le lot, puis depuis la fiche dossier cliquer sur <Button size="sm" className="cursor-default"><CheckCircle size={16} weight="duotone" />Finaliser le dossier</Button></p>
                <p>Le système effectue automatiquement :</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li>Création d&apos;une entrée <AppLink href="/stock">stock bijoux</AppLink> pour chaque article avec le statut <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">En dépôt-vente</Badge></li>
                  <li>Le stock conserve la traçabilité : identifiant du lot et du client déposant</li>
                  <li>Génération d&apos;un <strong>contrat de dépôt-vente</strong> (PDF) — un par lot</li>
                  <li>Génération d&apos;un document <strong>Confié</strong> (PDF) — un par article déposé</li>
                </ul>
                <p>Les articles sont maintenant visibles dans le <AppLink href="/stock">stock bijoux</AppLink> et peuvent être vendus via une vente classique.</p>
              </div>
            ),
          },
          {
            id: "depot-4",
            label: "Suivi des articles",
            content: (
              <div className="space-y-3">
                <p>Une fois les articles en dépôt-vente dans le stock, deux issues sont possibles :</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 font-medium">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Vendu</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        L&apos;article est vendu via un lot de vente classique. Le déposant reçoit le montant convenu (prix d&apos;achat).
                        Une quittance de dépôt-vente est automatiquement générée pour le déposant.
                      </p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 font-medium">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Rendu client</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        L&apos;article invendu est restitué au déposant. Sur la fiche lot, cliquer sur le bouton &quot;Restituer&quot; de la référence concernée.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: "depot-5",
            label: "Restituer un article",
            content: (
              <div className="space-y-3">
                <p>Si un article ne se vend pas, depuis la fiche du lot dépôt-vente cliquer sur <Button variant="outline" size="sm" className="cursor-default">Restituer</Button></p>
                <p>Cette action :</p>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  <li>Passe la référence en statut <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Rendu client</Badge></li>
                  <li>Met à jour le <AppLink href="/stock">stock bijoux</AppLink> correspondant</li>
                  <li>L&apos;article n&apos;est plus disponible à la vente</li>
                </ul>
              </div>
            ),
          },
        ],
      },
    ],
  },
  {
    label: "Pages",
    sections: [
      {
        id: "page-parametres",
        title: "Paramètres",
        icon: Gear,
        content: (
          <div className="space-y-4">
            <p>Configuration des valeurs globales de l&apos;application depuis <AppLink href="/parametres">Paramètres</AppLink>.</p>
          </div>
        ),
        steps: [
          {
            id: "param-1",
            label: "Cours des métaux",
            content: (
              <div className="space-y-3">
                <p>L&apos;onglet <strong>Prix du cours</strong> permet de définir le prix au gramme pour chaque métal :</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <p className="flex items-center gap-2 font-medium">
                        <Coins size={16} weight="duotone" />
                        Or (€/g)
                      </p>
                      <p className="text-xs text-muted-foreground">Cours actuel de l&apos;or au gramme</p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <p className="flex items-center gap-2 font-medium">
                        <Coins size={16} weight="duotone" />
                        Argent (€/g)
                      </p>
                      <p className="text-xs text-muted-foreground">Cours actuel de l&apos;argent au gramme</p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <p className="flex items-center gap-2 font-medium">
                        <Coins size={16} weight="duotone" />
                        Platine (€/g)
                      </p>
                      <p className="text-xs text-muted-foreground">Cours actuel du platine au gramme</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800/50">
                <div className="flex items-center gap-2 border-b border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-800 dark:border-blue-800/50 dark:text-blue-300">
                  <Info size={16} weight="duotone" className="shrink-0" />
                  Snapshot
                </div>
                <p className="px-4 py-3 text-sm text-blue-700 dark:text-blue-400">Les cours et coefficients sont &quot;snapshotés&quot; à la création de chaque lot. Modifier les paramètres n&apos;affecte pas les lots existants.</p>
              </div>
            ),
          },
          {
            id: "param-2",
            label: "Coefficients",
            content: (
              <div className="space-y-3">
                <p>Les coefficients déterminent le prix d&apos;achat et de vente :</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li><strong>Coefficient de rachat</strong> — Ex : 0.85 = on rachète à 85% du cours</li>
                  <li><strong>Coefficient de vente</strong> — Ex : 1.05 = on vend à 105% du cours</li>
                </ul>
                <p>Formule de calcul : <code>cours métal × (titrage / 1000) × poids × coefficient</code></p>
              </div>
            ),
          },
          {
            id: "param-3",
            label: "Apparence",
            content: (
              <div className="space-y-3">
                <p>L&apos;onglet <strong>Apparence</strong> permet de basculer entre les thèmes <strong>Clair</strong>, <strong>Sombre</strong> et <strong>Système</strong>.</p>
              </div>
            ),
          },
        ],
      },
      {
        id: "page-stock",
        title: "Stock bijoux",
        icon: Diamond,
        content: (
          <div className="space-y-4">
            <p>Inventaire de tous les bijoux en boutique, accessible depuis <AppLink href="/stock">Stock bijoux</AppLink>.</p>
          </div>
        ),
        steps: [
          {
            id: "stock-1",
            label: "Consulter le stock",
            content: (
              <div className="space-y-3">
                <p>La page affiche un tableau avec recherche et filtres. Chaque article montre sa désignation, métal, qualité, poids, prix et statut.</p>
                <p>Quatre statuts possibles :</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">En stock</Badge>
                      <p className="text-xs text-muted-foreground">Disponible à la vente</p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">En dépôt-vente</Badge>
                      <p className="text-xs text-muted-foreground">Propriété d&apos;un déposant, disponible à la vente</p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Vendu</Badge>
                      <p className="text-xs text-muted-foreground">Article vendu à un client</p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardContent className="space-y-1">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Rendu client</Badge>
                      <p className="text-xs text-muted-foreground">Restitué au déposant</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800/50">
                <div className="flex items-center gap-2 border-b border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-800 dark:border-blue-800/50 dark:text-blue-300">
                  <Info size={16} weight="duotone" className="shrink-0" />
                  Traçabilité
                </div>
                <p className="px-4 py-3 text-sm text-blue-700 dark:text-blue-400">Chaque article conserve la traçabilité de son lot d&apos;origine et du client associé. Le stock est alimenté automatiquement par les rachats et dépôts-vente finalisés.</p>
              </div>
            ),
          },
        ],
      },
      {
        id: "page-or",
        title: "Or investissement",
        icon: Coins,
        content: (
          <div className="space-y-4">
            <p>Catalogue des pièces et lingots d&apos;or investissement, accessible depuis <AppLink href="/or-investissement">Or investissement</AppLink>.</p>
          </div>
        ),
        steps: [
          {
            id: "or-1",
            label: "Consulter le catalogue",
            content: (
              <div className="space-y-3">
                <p>Contrairement aux bijoux (articles uniques), l&apos;or investissement est géré en <strong>quantité</strong>. Chaque référence a une désignation, un poids, un métal et un stock disponible.</p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm">
                  <li><strong>Quantité</strong> — Incrémentée automatiquement lors d&apos;un rachat finalisé, décrémentée lors d&apos;une vente</li>
                  <li><strong>Prix</strong> — Calculé selon le cours du métal et le coefficient configuré dans les <AppLink href="/parametres">Paramètres</AppLink></li>
                </ul>
              </div>
            ),
          },
        ],
      },
      {
        id: "page-fonderies",
        title: "Fonderies",
        icon: Package,
        content: (
          <div className="space-y-4">
            <p>Gestion des fournisseurs (fonderies) depuis <AppLink href="/fonderies">Fonderies</AppLink>.</p>
          </div>
        ),
        steps: [
          {
            id: "fonderie-1",
            label: "Gérer les fonderies",
            content: (
              <div className="space-y-3">
                <p>La page affiche un tableau avec recherche et tri par nom, ville ou téléphone.</p>
                <p>Cliquer sur <Button size="sm" className="cursor-default"><Plus size={14} weight="bold" />Nouvelle fonderie</Button> pour ajouter un fournisseur.</p>
                <p>Chaque fonderie peut ensuite être sélectionnée lors du routage des lignes dans la page <AppLink href="/fonderie/routage">Commandes</AppLink>.</p>
              </div>
            ),
          },
        ],
      },
    ],
  },
  {
    label: "Configuration",
    sections: [
      {
        id: "page-emails",
        title: "Notifications email",
        icon: EnvelopeSimple,
        content: (
          <div className="space-y-4">
            <p>
              Envoi automatique d&apos;emails via <strong>Resend</strong> aux moments clés des flux métier.
              Les templates sont éditables depuis <AppLink href="/parametres">Paramètres</AppLink> &gt; Emails.
            </p>
          </div>
        ),
        steps: [
          {
            id: "email-1",
            label: "Emails client",
            content: (
              <div className="space-y-3">
                <p>Emails envoyés automatiquement au client avec un PDF en pièce jointe :</p>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  <li><strong>Devis envoyé</strong> — Quand un devis de rachat est généré (PJ : devis PDF)</li>
                  <li><strong>Contrat de rachat finalisé</strong> — À la finalisation du rachat (PJ : contrat + quittance)</li>
                  <li><strong>Contrat de dépôt-vente</strong> — À la création du dépôt-vente (PJ : contrat)</li>
                  <li><strong>Facture d&apos;acompte</strong> — Acompte 10% pour or investissement (PJ : facture)</li>
                  <li><strong>Facture de vente</strong> — À la clôture de la vente (PJ : facture)</li>
                  <li><strong>Quittance dépôt-vente</strong> — Quand un article en dépôt est vendu (PJ : quittance)</li>
                </ul>
              </div>
            ),
          },
          {
            id: "email-2",
            label: "Alertes internes",
            content: (
              <div className="space-y-3">
                <p>Notifications envoyées à l&apos;équipe OJP :</p>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  <li><strong>Devis accepté</strong> — Le client a accepté, rétractation en cours</li>
                  <li><strong>Rétractation client</strong> — Le client s&apos;est rétracté</li>
                  <li><strong>Lot finalisable</strong> — Délai de rétractation expiré (cron automatique)</li>
                  <li><strong>Acompte expiré</strong> — Deadline de paiement du solde dépassée (cron automatique)</li>
                </ul>
              </div>
            ),
          },
          {
            id: "email-3",
            label: "Personnaliser les templates",
            content: (
              <div className="space-y-3">
                <p>Depuis <AppLink href="/parametres">Paramètres</AppLink> &gt; Emails, chaque notification a un <strong>objet</strong> et un <strong>corps</strong> personnalisables.</p>
                <p>Des variables comme <code>{"{{client_nom}}"}</code>, <code>{"{{lot_numero}}"}</code> ou <code>{"{{montant_total}}"}</code> sont remplacées automatiquement à l&apos;envoi. La liste des variables disponibles est affichée sous chaque template.</p>
              </div>
            ),
            note: (
              <div className="overflow-hidden rounded-xl bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800/50">
                <div className="flex items-center gap-2 border-b border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-800 dark:border-blue-800/50 dark:text-blue-300">
                  <Info size={16} weight="duotone" className="shrink-0" />
                  Mode test
                </div>
                <p className="px-4 py-3 text-sm text-blue-700 dark:text-blue-400">En mode domaine de test Resend, tous les emails sont envoyés à l&apos;adresse vérifiée configurée dans <code>RESEND_TEST_RECIPIENT</code>, quel que soit le destinataire réel.</p>
              </div>
            ),
          },
        ],
      },
    ],
  },
];
