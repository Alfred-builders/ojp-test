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

## Git Workflow

- **Ne JAMAIS push directement sur `main`** sauf demande explicite de l'utilisateur
- **Toujours push sur `staging`** pour tout nouveau travail
- Branche `main` = production, branche `staging` = développement/review
