# Méthodologie Design & UX — Or au Juste Prix

> Ce document capture l'intégralité de la méthodologie design et UX construite au fil du projet OJP. Il sert de référence pour reproduire ce niveau de qualité sur d'autres projets.

---

## Table des matières

1. [Philosophie générale](#1-philosophie-générale)
2. [Stack technique](#2-stack-technique)
3. [Système de couleurs](#3-système-de-couleurs)
4. [Typographie](#4-typographie)
5. [Système d'élévation (shadows)](#5-système-délévation-shadows)
6. [Border radius](#6-border-radius)
7. [Espacement & Layout](#7-espacement--layout)
8. [Iconographie](#8-iconographie)
9. [Boutons](#9-boutons)
10. [Cards](#10-cards)
11. [Formulaires & Inputs](#11-formulaires--inputs)
12. [Tables](#12-tables)
13. [Dialogs & Sheets](#13-dialogs--sheets)
14. [Badges & Statuts](#14-badges--statuts)
15. [Navigation & Sidebar](#15-navigation--sidebar)
16. [Header & Structure de page](#16-header--structure-de-page)
17. [Pages détail (CRUD)](#17-pages-détail-crud)
18. [Pages liste](#18-pages-liste)
19. [Actions & Workflows](#19-actions--workflows)
20. [Notifications & Feedback](#20-notifications--feedback)
21. [États vides, chargement, erreurs](#21-états-vides-chargement-erreurs)
22. [Recherche globale (Command Palette)](#22-recherche-globale-command-palette)
23. [Documentation intégrée](#23-documentation-intégrée)
24. [Dark mode](#24-dark-mode)
25. [Responsive design](#25-responsive-design)
26. [Accessibilité](#26-accessibilité)
27. [Conventions de code](#27-conventions-de-code)
28. [Checklist de qualité](#28-checklist-de-qualité)

---

## 1. Philosophie générale

### Principes fondateurs

- **Consistance avant tout** : chaque élément suit les mêmes règles partout. Un bouton se comporte toujours pareil, une card a toujours la même structure, un statut a toujours la même couleur.
- **Un seul design system** : on ne mélange pas les librairies. Un seul jeu d'icônes (Phosphor), un seul framework de composants (Shadcn), un seul système de couleurs (OKLCH).
- **Élévation = hiérarchie** : les shadows ne sont pas décoratives. Elles créent une hiérarchie visuelle claire (4 niveaux) qui guide l'œil de l'utilisateur.
- **Lisibilité > esthétique** : le contraste texte/fond est toujours vérifié. Pas de `text-primary` sur fond blanc. Pas de texte trop clair.
- **Le design est dans les détails** : icônes devant chaque titre de card, leading icons sur chaque bouton, animations subtiles mais présentes, espacement cohérent.

### Approche itérative

Le design s'est construit de manière itérative :
1. **Fondations** : mise en place du thème (couleurs OKLCH, font Inter, shadows custom)
2. **Composants de base** : personnalisation des composants Shadcn (boutons, cards, inputs, selects)
3. **Patterns de page** : définition des layouts (detail page, list page, form page)
4. **Polissage** : ajustements fin (élévation des boutons, icons Phosphor partout, DatePicker custom, documentation inline)
5. **Feedback loops** : correction continue basée sur le rendu réel (select w-full, text-primary retiré, etc.)

---

## 2. Stack technique

| Élément | Choix | Pourquoi |
|---------|-------|----------|
| Framework | Next.js (App Router) + React 19 | SSR, RSC, routing moderne |
| Styling | Tailwind CSS v4 | Utility-first, design tokens via CSS variables |
| Composants UI | Shadcn UI (base-nova) | Composants accessibles, personnalisables, pas de lock-in |
| Icônes | Phosphor Icons (duotone) | Style cohérent, large choix, poids ajustable |
| Animations | Tailwind + CSS natives | Pas de librairie externe, léger |
| Thème couleurs | OKLCH via CSS variables | Perceptuellement uniforme, meilleur rendu des dégradés |
| Notifications | Sonner | Toasts élégants, empilés, auto-dismiss |
| Variants | Class Variance Authority (CVA) | Gestion propre des variants de composants |
| Classes | cn() = clsx + twMerge | Merge intelligent de classes Tailwind |

### Ajout de composants

Toujours via CLI : `npx shadcn@latest add <component>`. Ne jamais créer manuellement dans `src/components/ui/`. Après ajout, vérifier les defaults (ex : `SelectTrigger` doit être `w-full`, pas `w-fit`).

---

## 3. Système de couleurs

### Palette OKLCH (Light mode)

```css
--background:     oklch(0.9892 0.0054 117.92)   /* Gris très clair, chaud */
--foreground:     oklch(0.2077 0.0398 265.75)   /* Bleu marine foncé */
--card:           oklch(1.0000 0 0)              /* Blanc pur */
--primary:        oklch(0.8871 0.2122 128.50)   /* Vert vif */
--primary-fg:     oklch(0 0 0)                   /* Noir sur primary */
--muted:          oklch(0.9683 0.0069 247.90)   /* Gris clair */
--muted-fg:       oklch(0.5544 0.0407 257.42)   /* Gris moyen */
--accent:         oklch(0.9819 0.0181 155.83)   /* Crème/jaune pâle */
--accent-fg:      oklch(0.4479 0.1083 151.33)   /* Brun */
--destructive:    oklch(0.6368 0.2078 25.33)    /* Rouge orangé */
--border:         oklch(0.9288 0.0126 255.51)   /* Gris bordure */
--link:           oklch(0.4500 0.1400 145.00)   /* Vert-teal */
```

### Règles d'utilisation des couleurs

| Couleur | Usage | Interdit |
|---------|-------|----------|
| `text-foreground` | Texte principal, titres, contenu important | — |
| `text-muted-foreground` | Labels, texte secondaire, descriptions | — |
| `text-primary` | Uniquement sur `bg-primary` ou fond contrasté | Sur fond blanc/clair |
| `text-destructive` | Erreurs, suppressions, alertes | Pour de l'info neutre |
| `bg-muted` | Fonds de sections, hover rows | — |
| `bg-muted/50` | Fonds subtils (footer, résumés) | — |

### Couleurs sémantiques de statut

| Couleur | Signification | Classes Tailwind |
|---------|---------------|------------------|
| Vert (emerald) | Succès, finalisé, valide | `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400` |
| Bleu | En cours, actif | `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400` |
| Rouge | Erreur, refusé, annulé | `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400` |
| Gris | Brouillon, neutre | `bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400` |
| Ambre | Warning, attention requise | `bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400` |

---

## 4. Typographie

### Fonts

| Usage | Font | Fallback |
|-------|------|----------|
| Interface (défaut) | Inter | system-ui, sans-serif |
| Code/technique | JetBrains Mono | monospace |

### Tailles & poids

| Élément | Taille | Poids | Couleur |
|---------|--------|-------|---------|
| Titre de page (header) | `text-base` | `font-semibold` | `text-foreground` |
| Titre de card | `text-base` | `font-medium` | `text-foreground` |
| Corps de texte | `text-sm` | `font-normal` | `text-foreground` ou `text-muted-foreground` |
| Labels de formulaire | `text-sm` | `font-medium` | `text-muted-foreground` |
| Texte small/caption | `text-xs` | `font-medium` | `text-muted-foreground` |
| Boutons | `text-sm` | `font-medium` | Dépend du variant |
| Badges | `text-xs` | `font-medium` | Dépend du variant |

### Letter spacing

Le tracking par défaut est serré (`-0.01em`) pour un rendu plus premium et moderne. C'est défini globalement, pas besoin de le répéter.

### Règles typographiques françaises

- **Accents** obligatoires partout : procédure, créer, sélectionner, numéro, généré, dépôt-vente, rétractation
- **Espace avant les deux-points** : typographie française standard
- **Mots-clés en `<strong>`** qui passe automatiquement en `text-foreground` dans du texte `text-muted-foreground`

---

## 5. Système d'élévation (shadows)

C'est un des éléments clés du design. 4 niveaux de profondeur créent une hiérarchie visuelle claire.

### Les 4 niveaux

| Niveau | Classes | Usage |
|--------|---------|-------|
| **0** — Plat | Aucune shadow | Inputs, badges, rows de table, ghost buttons |
| **1** — Léger | `shadow-sm` | Cards, header, pagination, sidebar, boutons (sauf ghost/link) |
| **2** — Moyen | `shadow-md ring-1 ring-foreground/10` | Popovers, dropdowns, selects ouverts |
| **3** — Fort | `shadow-lg ring-1 ring-foreground/10` | Sheets, dialogs, menus imbriqués |

### Valeurs CSS custom

```css
/* Light mode */
--shadow-sm: 0px 8px 20px 0px hsl(0 0% 0% / 0.05), 0px 1px 2px -1px hsl(0 0% 0% / 0.05);
--shadow-md: 0px 8px 20px 0px hsl(0 0% 0% / 0.05), 0px 2px 4px -1px hsl(0 0% 0% / 0.05);
--shadow-lg: 0px 8px 20px 0px hsl(0 0% 0% / 0.05), 0px 4px 6px -1px hsl(0 0% 0% / 0.05);

/* Dark mode — opacité et blur augmentés */
--shadow-sm: 0px 8px 25px 0px hsl(0 0% 0% / 0.4), 0px 1px 2px -1px hsl(0 0% 0% / 0.4);
```

### Règles strictes

- **Jamais `shadow` seul** → toujours `shadow-sm`, `shadow-md`, ou `shadow-lg`
- **Niveaux 2+** → ajouter `ring-1 ring-foreground/10` pour renforcer le contour
- **Ne pas mélanger `border` et `shadow`** pour l'élévation → choisir l'un ou l'autre
- **Les boutons ont `shadow-sm`** (niveau 1) sauf `ghost` et `link` qui ont `shadow-none`

---

## 6. Border radius

### Échelle (base : `--radius: 1rem`)

| Token | Valeur | Usage |
|-------|--------|-------|
| `rounded-sm` | 0.6rem | Petits éléments contraints |
| `rounded-md` | 0.8rem | Icon buttons, petits éléments |
| `rounded-lg` | 1rem | Boutons, inputs (défaut) |
| `rounded-xl` | 1.4rem | Cards, dialogs, popovers |
| `rounded-4xl` | 2.6rem | Badges/pills (full round) |

### Convention

- **Boutons & inputs** : `rounded-lg`
- **Cards & dialogs** : `rounded-xl`
- **Badges** : `rounded-4xl` (pill shape)
- **Icon buttons petits** : `rounded-md`

---

## 7. Espacement & Layout

### Unité de base

`--spacing: 0.25rem` (4px). Tout l'espacement utilise les multiples Tailwind (1 = 4px, 2 = 8px, 3 = 12px, 4 = 16px, etc.).

### Gaps fréquents

| Contexte | Gap |
|----------|-----|
| Items de menu sidebar | `gap-2` (8px) |
| Icône + texte (bouton, titre) | `gap-1.5` à `gap-2` (6-8px) |
| Champs de formulaire | `gap-3` (12px) |
| Contenu de card | `gap-4` (16px) |
| Grille de KPIs dashboard | `gap-4` (16px) |

### Paddings fréquents

| Contexte | Padding |
|----------|---------|
| Card | `py-4 px-4` (16px) |
| Card header | `px-4 py-1` à `py-3` |
| Dialog content | `p-4` (16px) |
| Input | `px-2.5 py-1` |
| Boutons | `px-2.5 py-1` (défaut) |
| Cellules de table | `px-2 py-3` |
| Page content | `px-6 pt-6 pb-8` |
| Page fullHeight | `px-6 pt-4 pb-4` |

### Layout full-height (pour les pages avec table)

Le pattern "full-height" empêche le scroll du body et rend la table scrollable indépendamment :

```tsx
// Container parent
className="relative flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden"

// Zone scrollable
className="flex-1 overflow-y-auto min-w-0"
```

### Grilles responsives

```tsx
// KPIs dashboard
className="grid grid-cols-2 xl:grid-cols-4 gap-4"

// Detail page
className="grid md:grid-cols-2 gap-4"
// ou
className="grid md:grid-cols-3 gap-4"
```

---

## 8. Iconographie

### Librairie unique : Phosphor Icons

**Règle absolue** : utiliser `@phosphor-icons/react` avec `weight="duotone"` partout. Jamais Lucide React pour les icônes visibles par l'utilisateur.

### Convention de poids (weight)

| Poids | Usage |
|-------|-------|
| `duotone` | Partout par défaut (icônes de card, boutons, navigation, statuts) |
| `regular` | Dots menu (`DotsThree`), flèches, chevrons/carets |
| `fill` | Cas rares (indicateurs actifs) |

### Convention de taille (size)

| Taille | Usage |
|--------|-------|
| `12` | Très petit (rare) |
| `14`–`16` | Icônes dans les boutons |
| `18` | Icônes dans la navigation sidebar |
| `20` | Icônes dans les titres de card |
| `28`–`32` | Icônes d'états vides, d'erreurs |
| `48` | Icônes de pages d'erreur |

### Règles

- **Chaque CardTitle** doit avoir une icône Phosphor duotone devant : `className="flex items-center gap-2"`
- **Chaque Button** doit avoir une leading icon (icône avant le texte)
- **Exception** : les composants internes Shadcn UI (sidebar trigger, etc.) qui utilisent Lucide en interne — ne pas les modifier

---

## 9. Boutons

### Variants

| Variant | Apparence | Usage |
|---------|-----------|-------|
| `default` | Fond vert primary, texte noir | Actions principales (Enregistrer, Créer) |
| `outline` | Bordure + fond léger | Actions secondaires (Annuler, Retour) |
| `secondary` | Fond gris/muted | Actions tertiaires |
| `ghost` | Transparent, hover muted | Actions discrètes (toolbar, inline) |
| `destructive` | Fond rouge léger | Supprimer, annuler |
| `link` | Texte souligné, pas de fond | Navigation inline |

### Tailles

| Taille | Hauteur | Usage |
|--------|---------|-------|
| `xs` | 24px (`h-6`) | Actions très compactes |
| `sm` | 28px (`h-7`) | Actions compactes dans les tables |
| `default` | 32px (`h-8`) | Standard |
| `lg` | 36px (`h-9`) | Actions principales proéminentes |
| `icon` | 32×32px | Bouton icône seul |
| `icon-sm` | 28×28px | Petit bouton icône |
| `icon-xs` | 24×24px | Très petit bouton icône |

### Comportements

- **Élévation** : `shadow-sm` sur tous les variants sauf `ghost` et `link` (qui ont `shadow-none`)
- **Hover** : `brightness-95` + élévation `shadow-md` sur le variant `default`
- **Press** : `translate-y-px` subtil au clic (sauf si haspopup)
- **Focus** : `ring-3 ring-ring/50`
- **Disabled** : `opacity-50 pointer-events-none`
- **Loading state** : texte "Enregistrement..." + disabled

### Pattern bouton avec icône

```tsx
<Button>
  <FloppyDisk weight="duotone" size={16} />
  Enregistrer
</Button>
```

---

## 10. Cards

### Structure standard

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <IconName weight="duotone" size={20} />
      Titre de la card
    </CardTitle>
    <CardDescription>Description optionnelle</CardDescription>
    <CardAction>
      <Button variant="ghost" size="icon-sm">...</Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    {/* Contenu */}
  </CardContent>
  <CardFooter>
    {/* Actions optionnelles */}
  </CardFooter>
</Card>
```

### Règles

- **Toujours une icône Phosphor duotone devant le `CardTitle`**
- **Rounded** : `rounded-xl`
- **Shadow** : `shadow-sm` (niveau 1)
- **Padding** : `py-4 px-4` (défaut), `py-3 px-3` (size="sm")
- **Footer** : `bg-muted/50` avec `border-t`
- **`CardAction`** : positionné en haut à droite du header pour les actions de la card

### Pattern "DetailRow" dans les cards

Pour afficher des paires clé-valeur dans les pages détail :

```tsx
<div className="flex justify-between items-center">
  <span className="text-sm text-muted-foreground">Label</span>
  <span className="text-sm font-medium">Valeur</span>
</div>
```

---

## 11. Formulaires & Inputs

### Hauteurs

Tous les inputs ont la même hauteur : `h-8` (32px). Cela inclut :
- Text input
- Select trigger
- DatePicker trigger
- Textarea : hauteur variable mais cohérente

### Input text

```
h-8 | px-2.5 py-1 | border border-input | bg-white dark:bg-card
rounded-lg | text-sm | placeholder:text-muted-foreground
focus: border-ring ring-3 ring-ring/50
disabled: bg-input/50 opacity réduite
invalid: border-destructive ring-destructive/20
```

### Select

- **Toujours `w-full`** sur le `SelectTrigger` (jamais `w-fit` — c'est un bug du défaut Shadcn base-nova)
- Le dropdown a `shadow-md ring-1 ring-foreground/10` (niveau 2)
- **Toujours passer les données résolues** en props : le Select affiche la `value` brute, pas le label. Si la value est un UUID, il affichera l'UUID.

### DatePicker

- **Toujours utiliser le composant `DatePicker`** de `@/components/ui/date-picker`
- **Jamais `<input type="date" />`**
- C'est un Popover + Calendar Shadcn avec locale française
- Props : `value: Date | undefined`, `onChange: (date: Date | undefined) => void`

### Labels

```tsx
<Label className="text-sm font-medium text-muted-foreground">
  Nom du champ <span className="text-destructive">*</span>
</Label>
```

### Erreurs de validation

- Affichées sous le champ en `text-destructive text-xs`
- Animation d'entrée : `animate-in fade-in-0 slide-in-from-top-1`
- Validation via schéma Zod, erreurs par champ

### Pattern de formulaire complet

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <User weight="duotone" size={20} />
      Informations personnelles
    </CardTitle>
  </CardHeader>
  <CardContent className="grid md:grid-cols-2 gap-3">
    <div className="flex flex-col gap-1.5">
      <Label>Prénom *</Label>
      <Input value={...} onChange={...} />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
    {/* Autres champs */}
  </CardContent>
</Card>
```

---

## 12. Tables

### Structure

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Colonne</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="cursor-pointer" onClick={...}>
      <TableCell>Contenu</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Styling

- **Header** : fond `bg-muted`, sticky, `h-10`, `font-medium`
- **Rows** : `hover:bg-muted/50`, `transition-colors`, `border-b`
- **Cellules** : `px-2 py-3`, `whitespace-nowrap`
- **Fond des rows** : `bg-white dark:bg-card`
- **Rows cliquables** : `cursor-pointer`, navigation au clic

### Colonnes triables

```tsx
<TableHead onClick={toggleSort} className="cursor-pointer">
  Nom
  {sortDirection === 'asc' ? <ArrowUp /> : <ArrowDown />}
</TableHead>
```

- Icône inactive : opacité 40%
- Icône active : opacité 100%
- Cycle : aucun → asc → desc → aucun

### Icône en première colonne

Pattern récurrent : icône circulaire dans un fond muted comme premier élément de chaque row :

```tsx
<div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
  <Package weight="duotone" size={16} className="text-muted-foreground" />
</div>
```

### Toolbar au-dessus de la table

- Input de recherche avec icône `MagnifyingGlass` (left)
- Filtres par statut (multi-select ou boutons)
- Tout côte à côte, `flex items-center gap-2`

### État vide

```tsx
<TableCell colSpan={columns} className="h-24 px-4 text-center text-muted-foreground">
  Aucun élément trouvé.
</TableCell>
```

### Pagination

- En bas de table
- Sélecteur de taille de page + navigation pages
- Affichage "Page X sur Y" + total items

---

## 13. Dialogs & Sheets

### Dialog (modale centrée)

- **Position** : centre de l'écran (`top-1/2 left-1/2 -translate`)
- **Taille** : `max-w-sm` (384px) pour les petites, `max-w-lg` (512px) pour les grandes
- **Shadow** : `shadow-lg ring-1 ring-foreground/10` (niveau 3)
- **Backdrop** : `bg-black/10 backdrop-blur-xs`
- **Animation** : `zoom-in-95 + fade-in` à l'ouverture
- **Close button** : en haut à droite, `size="icon-sm"`

### Structure standard

```tsx
<Dialog>
  <DialogTrigger render={<Button>Ouvrir</Button>} />
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titre</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Formulaire ou contenu */}
    <DialogFooter>
      <DialogClose render={<Button variant="outline">Annuler</Button>} />
      <Button onClick={handleSubmit}>Confirmer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Sheet (panneau latéral)

- Même logique mais slide depuis le côté (right par défaut)
- Largeur : `w-3/4` mobile
- Utilisé pour les formulaires longs ou les aperçus

---

## 14. Badges & Statuts

### Badge component

- **Forme** : pill (`rounded-4xl`)
- **Hauteur** : `h-5` fixe
- **Padding** : `px-2 py-0.5`
- **Texte** : `text-xs font-medium whitespace-nowrap`
- **Pas de shadow** (niveau 0)

### Mapping des statuts

| Statut | Couleur | Icône |
|--------|---------|-------|
| Brouillon | Gris | — |
| En cours | Bleu | — |
| Finalisé | Vert emerald | Check |
| Refusé / Annulé | Rouge | X |
| En attente | Ambre | Clock |

### Pattern badge de statut custom

```tsx
const statusClasses = {
  brouillon: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  en_cours: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  finalise: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  refuse: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
```

---

## 15. Navigation & Sidebar

### Structure

```
Sidebar (16rem expanded / 3rem collapsed)
├── Logo
├── SidebarGroup
│   ├── SidebarGroupLabel (uppercase, muted)
│   ├── SidebarSeparator
│   └── SidebarMenu
│       └── SidebarMenuItem
│           └── SidebarMenuButton (icône 18px duotone + label)
├── ... (autres groupes)
└── SidebarFooter (profil utilisateur)
```

### Comportement

- **Cookie-based persistence** : l'état ouvert/fermé est sauvegardé
- **Raccourci** : `Alt+B` pour toggle
- **Mobile** : `w-18rem`, overlay
- **Hover expand** : quand collapsed, s'expand au hover
- **Active state** : vérifie le path exact + prefix match

### Icônes de navigation

- Taille : `size={18}`
- Poids : `weight="duotone"`
- Couleur : `text-muted-foreground` (inactif) / `text-foreground` (actif)

---

## 16. Header & Structure de page

### Header

```
[← Back] [Titre de la page] [Badge statut]        [Actions] [🔍] [🔔]
```

- **Hauteur** : `h-14` (56px) fixe
- **Background** : `bg-white dark:bg-card`
- **Shadow** : `shadow-sm` (niveau 1)
- **Z-index** : `z-10`

### PageWrapper

Le composant `PageWrapper` encapsule toutes les pages et gère :
- Le header (titre, actions, back button)
- Le padding du contenu
- Le mode fullHeight (pour les tables)

**Deux modes** :
1. **Scrollable** (défaut) : `overflow-y-auto`, padding `px-6 pt-6 pb-8`
2. **fullHeight** : `flex flex-col min-h-0`, padding `px-6 pt-4 pb-4`, pour les pages avec table

---

## 17. Pages détail (CRUD)

### Structure type d'une page détail

```
Header : Titre + Badge statut + [Modifier] [Enregistrer] [Finaliser]
──────────────────────────────────────────────────────────────────────
Grid 2-3 colonnes :
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 📋 Info Card     │  │ 👤 Client Card   │  │ ⚡ Actions Card  │
│ DetailRow...     │  │ DetailRow...     │  │ ActionRow...     │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Full-width :
┌───────────────────────────────────────────────────────────────────┐
│ 📦 Lots / Références                          [+ Ajouter]       │
│ Table ou liste de cards                                          │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ 📄 Documents                                                      │
│ Table documents                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ 📝 Notes                                      [Modifier]         │
│ Textarea ou texte                                                 │
└───────────────────────────────────────────────────────────────────┘
```

### Patterns récurrents

- **Edit mode toggle** : le header a un bouton "Modifier" qui active l'édition inline (les DetailRow deviennent des inputs)
- **Save dans le header** : le bouton "Enregistrer" apparaît dans le header quand editing=true
- **Status badge** : toujours à côté du titre dans le header
- **Back button** : flèche retour qui ramène à la liste

### Stepper (workflow)

Pour les entités avec un cycle de vie (lots, ventes) :
- Horizontal, entre le header et le contenu
- Steps avec icônes : completed (check) / current (primary ring) / future (muted) / error (destructive)
- Labels + descriptions sous chaque step
- Masqué si statut "brouillon"

### Encadré résumé de prix

```tsx
<div className="rounded-lg border bg-muted/50 p-4">
  <div className="flex items-center gap-2 text-sm font-medium mb-3">
    <Receipt weight="duotone" size={16} />
    Résumé
  </div>
  {/* Lignes de détail */}
  <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
    <span>Total</span>
    <span>1 234,56 €</span>
  </div>
</div>
```

---

## 18. Pages liste

### Structure type

```
Header : Titre + [+ Créer nouveau]
──────────────────────────────────
Toolbar : [🔍 Rechercher...] [Filtre statut ▾]
──────────────────────────────────────────────
Table (fullHeight, scrollable)
│ Icône | Nom | Statut | Date | ... | ⋯ |
│ ...                                      │
──────────────────────────────────────────────
Pagination : [< Page 1 sur 5 >] [10 par page ▾]
```

### Données côté serveur

- **Server Components** par défaut (RSC)
- **Search params** pour la pagination : `?page=0&size=20`
- **Parallel fetching** avec `Promise.all()` pour les données liées
- **Supabase range** : `from = page * size`, `to = from + size - 1`

---

## 19. Actions & Workflows

### Action Dashboard

Composant central qui affiche les actions disponibles pour une entité :

```
⚡ Actions en attente (3)
├── 📋 Devis #123 — Client X     [✓ Accepter] [✗ Refuser]
├── 💳 Paiement — 500,00 €       [Enregistrer le paiement]
└── 📦 Livraison — Lot #456      [Marquer livré]
```

### Pattern d'une action row

```tsx
<div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
  <div className="flex items-center gap-3">
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
      <Icon weight="duotone" size={16} className="text-muted-foreground" />
    </div>
    <div>
      <p className="text-sm font-medium">Label de l'action</p>
      <p className="text-xs text-muted-foreground">Contexte</p>
    </div>
  </div>
  <Button size="sm">Action</Button>
</div>
```

### Types d'actions

- **Dual buttons** (Accepter/Refuser) : pour les devis
- **Single button** : pour les paiements, livraisons
- **Destructive button** : pour les rétractations, annulations
- **Dialog trigger** : certaines actions ouvrent un dialog de confirmation

---

## 20. Notifications & Feedback

### Toasts (Sonner)

```tsx
toast.success("Dossier créé avec succès");
toast.error("Erreur lors de la sauvegarde");
```

- Auto-dismiss après 3-4 secondes
- Empilés en bas à droite
- Utilisés pour toutes les actions utilisateur (save, delete, create)

### Notification Bell

- **Popover** (pas une page dédiée)
- **Badge compteur** : rouge, max "99+"
- **Items** : icône + titre + message (2 lignes max) + timestamp relatif
- **Dot bleu** : indicateur non lu
- **Mark all as read** : bouton dans le header
- **État vide** : icône 32px à 50% opacité + "Aucune notification"
- **Loading** : skeleton state

### Alertes inline

Pour les situations urgentes (ex : deadline de paiement) :

```tsx
<div className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 rounded-lg border p-4">
  <Icon className="text-amber-600" />
  <strong>Attention</strong>
  <p>Message d'alerte...</p>
</div>
```

---

## 21. États vides, chargement, erreurs

### État vide

```tsx
// Dans une table
<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
  Aucun lot trouvé.
</TableCell>

// Dans une liste/card
<p className="text-sm text-muted-foreground text-center py-8">
  Aucune référence. Ajoutez des bijoux ou de l'or investissement.
</p>

// Avec icône (notifications, etc.)
<div className="flex flex-col items-center justify-center py-8">
  <Icon size={32} className="text-muted-foreground/50" />
  <p className="text-sm text-muted-foreground mt-2">Aucun élément.</p>
</div>
```

### État de chargement

- **Pages** : skeleton components qui reprennent la structure de la page (titre skeleton + grille de cards skeleton)
- **Boutons** : `disabled={loading}` + texte "Enregistrement..."
- **Listes** : skeleton rows dans la table

### Page d'erreur

```
       ⚠️ (48px, text-destructive)
    Une erreur est survenue
  Une erreur inattendue s'est produite...
       [🔄 Réessayer]
```

- Centré sur la page, flexbox
- Bouton "Réessayer" avec icône
- `WarningCircle` en icône, 48px, `text-destructive`

---

## 22. Recherche globale (Command Palette)

### Comportement

- **Trigger** : `Cmd+K` / `Ctrl+K`
- **Position** : 15% depuis le haut, centré
- **Taille** : `max-w-lg` (512px)
- **Input** : pleine largeur, fond transparent, auto-focus

### Résultats

- Organisés par catégorie (Actions rapides, Navigation, puis par type d'entité)
- Navigation clavier : flèches haut/bas + Enter
- Hover change l'élément actif
- Scroll-into-view automatique

### Quick Actions

- Créer client, dossier, lot, commande
- Navigation vers les pages principales
- Raccourcis clavier affichés (desktop only)

---

## 23. Documentation intégrée

### Architecture

- **Une seule page scrollable** avec IntersectionObserver pour tracker la section active
- **Navigation latérale** : catégories > sections > steps
- **Contenu centré** : `mx-auto max-w-4xl`

### Cards d'étapes

```
┌──────────────────────────────┐
│ ① Titre de l'étape           │
├──────────────────────────────┤
│ Contenu avec boutons inline  │
│ et texte descriptif.         │
└──────────────────────────────┘
```

- `!gap-0 !py-0` pour override les defaults
- Contenu : `px-5 py-4`
- Pastille numérotée dans le header + `border-b`

### Boutons inline

Les boutons dans la doc sont **toujours inline** dans le texte :
- ❌ `Cliquer sur : [Créer]`
- ✅ `Cliquer sur [Créer] pour...`
- `className="cursor-default mx-1.5 align-middle"` (non cliquables)
- Ce sont les vrais composants Button de l'app

### Notes info/warning

- **Hors des cartes** (pas dans le contenu d'une étape)
- Structure card-like : `overflow-hidden rounded-xl shadow-sm ring-1`
- **Bleu** pour info, **ambre** pour warning
- Header avec icône + titre + `border-b`, puis contenu en dessous

### Liens internes (AppLink)

- Composant `AppLink` pour toutes les mentions de pages internes
- `target="_blank"` + hover avec `bg-muted` + chevron qui slide

### Screenshots

- Script Playwright : `scripts/capture-doc-screenshots.ts`
- Images dans `public/docs/`
- `<img>` natif avec `className="rounded-lg border shadow-sm"`

---

## 24. Dark mode

### Implémentation

- **next-themes** avec `ThemeProvider`
- Attribut : `class` (ajoute `.dark` sur `<html>`)
- Défaut : `system` (respecte la préférence OS)

### Adaptations en dark mode

- **Couleurs** : toutes les variables OKLCH sont overridées
- **Shadows** : opacité augmentée de 0.05 à 0.4 + blur de 20px à 25px
- **Background** : passe à `oklch(0.1288...)` (très sombre)
- **Card** : légèrement plus clair que le background
- **Borders** : s'assombrissent

### Convention

- Utiliser `dark:` prefix quand les couleurs sémantiques ne suffisent pas
- Exemple : `bg-white dark:bg-card` pour les inputs
- Les couleurs de statut (emerald, blue, red, amber) ont toutes leurs variantes dark

---

## 25. Responsive design

### Breakpoints

| Prefix | Largeur min | Usage |
|--------|-------------|-------|
| `sm:` | 640px | Petits écrans |
| `md:` | 768px | Tablettes |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Grand écran |

### Approche mobile-first

```tsx
// Stack vertical → grid horizontal
className="flex flex-col sm:flex-row"

// 2 colonnes → 4 colonnes
className="grid grid-cols-2 xl:grid-cols-4"

// Caché sur mobile
className="hidden sm:inline-flex"

// Padding responsive
className="px-4 md:px-6"
```

### Sidebar responsive

- Desktop : sidebar permanente (collapsible)
- Mobile : sidebar en overlay, fermée par défaut
- Largeur mobile : `w-18rem`

### Dialogs responsifs

```tsx
className="w-full max-w-[calc(100%-2rem)] sm:max-w-sm"
```

---

## 26. Accessibilité

### ARIA

- `aria-expanded` sur les éléments expandables
- `aria-invalid` pour la validation des formulaires
- `aria-haspopup` sur les boutons qui ouvrent un menu/dialog
- `aria-label` sur les boutons icône seuls

### Focus

- Ring visible : `focus-visible:ring-3 focus-visible:ring-ring/50`
- Focus trap dans les dialogs/modals
- Navigation clavier dans les selects et command palette

### Sémantique HTML

- Bonne hiérarchie de headings
- `<label>` pour chaque input
- `<th>` sémantiques dans les tables
- Skip-to-content link dans le layout principal
- `sr-only` pour le texte screen reader

---

## 27. Conventions de code

### Nommage

| Type | Convention | Exemple |
|------|-----------|---------|
| Composants | PascalCase | `DossierDetailPage` |
| Props | camelCase | `onSave`, `isEditing` |
| Fichiers TS/TSX | kebab-case | `dossier-detail-page.tsx` |
| CSS variables | --kebab-case | `--primary-foreground` |
| Classes Tailwind | kebab-case | `text-muted-foreground` |
| Data slots | kebab-case | `data-slot="card-header"` |

### Organisation des fichiers

```
src/components/
├── ui/              # Composants Shadcn (générés, personnalisables)
├── dashboard/       # Layout (header, sidebar, page-wrapper)
├── actions/         # Composants d'actions métier
├── clients/         # Module clients
├── dossiers/        # Module dossiers
├── lots/            # Module lots
├── commandes/       # Module commandes
├── ventes/          # Module ventes
├── stock/           # Module stock
├── documents/       # Module documents
├── reglements/      # Module règlements
└── documentation/   # Module documentation
```

### Pattern composant feature

Chaque module a typiquement :
- `<entity>-detail-page.tsx` — Page détail complète
- `<entity>-create-page.tsx` — Page de création (formulaire)
- `<entity>-table.tsx` — Table de liste
- `<entity>-toolbar.tsx` — Toolbar de filtres
- `<entity>-status-badge.tsx` — Badge de statut custom

### Server vs Client

- **Server Components** par défaut (RSC) pour les pages
- **Client Components** (`"use client"`) pour les composants interactifs
- Les pages fetchent les données et les passent en props aux composants client

---

## 28. Checklist de qualité

Avant de considérer une page/composant comme terminé, vérifier :

### Design

- [ ] Chaque CardTitle a une icône Phosphor duotone devant
- [ ] Chaque Button a une leading icon
- [ ] Aucun `text-primary` sur fond blanc
- [ ] Les shadows respectent les 4 niveaux (pas de `shadow` seul)
- [ ] Les boutons ont `shadow-sm` (sauf ghost/link)
- [ ] Les Selects sont en `w-full`
- [ ] Les dates utilisent le composant `DatePicker`
- [ ] Les icônes sont toutes Phosphor (pas de Lucide visible)

### Couleurs & Contraste

- [ ] `text-foreground` pour le texte principal
- [ ] `text-muted-foreground` pour les labels/secondaire
- [ ] Couleurs de statut cohérentes (vert/bleu/rouge/gris/ambre)
- [ ] Dark mode fonctionne correctement

### Layout

- [ ] Page fullHeight pour les tables (pas de double scroll)
- [ ] Grilles responsives (`md:grid-cols-2`, etc.)
- [ ] Espacement cohérent (`gap-4` entre cards)
- [ ] Padding correct dans les cards (`py-4 px-4`)

### UX

- [ ] État vide quand la liste est vide
- [ ] Loading state sur les boutons de soumission
- [ ] Toast de feedback après chaque action
- [ ] Erreurs de validation visibles et claires
- [ ] Navigation retour (back button) sur les pages détail
- [ ] Rows de table cliquables avec cursor-pointer

### Typographie FR

- [ ] Accents sur tous les mots français
- [ ] Espace avant les deux-points
- [ ] Texte cohérent (pas de mélange fr/en dans l'UI)

### Documentation

- [ ] Si un process a changé, la documentation est mise à jour
- [ ] Boutons inline (pas de "cliquer sur :")
- [ ] Notes info/warning hors des cards
- [ ] Accents français corrects

---

## Résumé : ce qui fait la différence

Ce qui distingue ce design d'un "simple" projet Shadcn :

1. **Le système d'élévation custom** : des shadows subtiles mais cohérentes qui créent une vraie profondeur
2. **La palette OKLCH** : des couleurs perceptuellement uniformes, bien calibrées light et dark
3. **Phosphor Icons duotone partout** : un style d'icône unique et cohérent qui donne du caractère
4. **Les leading icons systématiques** : chaque bouton et titre de card a son icône
5. **L'attention aux détails** : tracking serré, border-radius généreux, animations subtiles
6. **La consistance absolue** : les mêmes patterns partout, pas d'exception
7. **Les corrections itératives** : select w-full, text-primary retiré, button elevation ajoutée — chaque feedback intégré

Le secret n'est pas dans une seule décision design spectaculaire, mais dans **l'accumulation de dizaines de petites décisions cohérentes** appliquées rigoureusement partout.
