# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Or au Juste Prix** — Application web Next.js (App Router).

## Commands

- `npm run dev` — Serveur de développement (http://localhost:3000)
- `npm run build` — Build de production
- `npm run start` — Démarrer le build de production
- `npm run lint` — Linter ESLint

## Architecture

- **Framework**: Next.js 16 avec App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4 + thème personnalisé tweakcn (variables CSS oklch dans `globals.css`)
- **UI Components**: Shadcn UI (style `base-nova`, icônes Lucide)
- **Import alias**: `@/*` → `./src/*`

### Structure

```
src/
  app/          # Routes Next.js (App Router, RSC par défaut)
  components/   # Composants React
    ui/         # Composants Shadcn UI (ne pas modifier manuellement)
  lib/          # Utilitaires (utils.ts avec cn())
```

### Conventions

- Ajouter des composants Shadcn via `npx shadcn@latest add <component>` (ne pas créer manuellement dans `ui/`)
- Les composants dans `src/components/ui/` sont générés par Shadcn — les personnaliser est OK mais préférer les props/variants
- `cn()` de `@/lib/utils` pour combiner les classes Tailwind

## Elevation System

4 niveaux d'élévation basés sur les shadows CSS variables (automatiquement adaptées au dark mode) :

| Niveau | Classes Tailwind | Usage |
|--------|-----------------|-------|
| 0 | Pas de shadow | Inputs, badges, table rows |
| 1 | `shadow-sm` | Cards, header, pagination, sidebar |
| 2 | `shadow-md ring-1 ring-foreground/10` | Popovers, dropdowns, selects |
| 3 | `shadow-lg ring-1 ring-foreground/10` | Sheets, dialogs, menus imbriqués |

- Ne jamais utiliser `shadow` seul → toujours `shadow-sm`, `shadow-md` ou `shadow-lg`
- Les niveaux 2+ ajoutent `ring-1 ring-foreground/10` pour renforcer le contour
- Ne pas mélanger `border` et `shadow` pour l'élévation — choisir l'un ou l'autre selon le niveau

## Supabase

- **Après chaque création/modification de migration**, exécuter automatiquement `npx supabase db push` sans attendre que l'utilisateur le demande
- **Pour exécuter des seeds ou du SQL arbitraire**, utiliser l'API REST Supabase avec le service role key :
  ```bash
  # Insérer des données
  curl -s -X POST "https://<project>.supabase.co/rest/v1/<table>" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"col":"value"}'
  ```
  Les credentials sont dans `.env.local` (`SUPABASE_SERVICE_ROLE_KEY` pour bypass RLS)

## Carnet d'idees (IDEES.md)

- L'utilisateur peut demander de **noter une idee** → l'ajouter dans `IDEES.md` sous la section appropriee (en creer une si besoin)
- Ce fichier est **purement personnel** : ne JAMAIS s'en servir pour guider un developpement, ne JAMAIS implementer une idee sauf demande explicite
- `IDEES.md` est dans le `.gitignore`

## Git Workflow

- **Ne JAMAIS push directement sur `main`** sauf demande explicite de l'utilisateur
- **Toujours push sur `staging`** pour tout nouveau travail
- Branche `main` = production, branche `staging` = développement/review
