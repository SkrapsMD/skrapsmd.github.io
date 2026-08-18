# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal academic/professional website for Michael Dwight Sparks, hosted on GitHub Pages. It is a **Vite + React 18 + TypeScript** single-page app. (It was a hand-authored static HTML/CSS/JS SPA until June 2026; the final static version is preserved on the `archive/pre-react-static` branch.)

## Development

```bash
npm install            # install deps
npm run dev            # Vite dev server → http://localhost:5173
npm run build          # production build → dist/
npm run preview        # preview the built dist/
npm run typecheck      # tsc --noEmit (the real type gate; build uses esbuild and skips types)
node scripts/ssr-smoke.mjs   # headless render check across every route (catches render crashes / missing content)
```

## Architecture

**SPA using `HashRouter`** (`react-router-dom`). Hash routing keeps every URL inside `#…`, which avoids GitHub Pages 404s on refresh and preserves the old `#research`-style links. A small shim in `src/main.tsx` rewrites legacy hashes (`#research` → `#/research`, `#person-<slug>` → `#/person/<slug>`).

**Directory structure (`src/`):**
- `main.tsx` — React entry; imports `styles/styles.css`; runs the legacy-hash shim.
- `App.tsx` — `HashRouter` + the route table. Heavy routes (`Specimen`, `Geocoder`) are `React.lazy` code-split.
- `layout/` — `Layout` (masthead, nav, footer, frame; wraps routed pages via `<Outlet/>` inside `<Suspense>`).
- `pages/` — one component per route (`Home`, `Research`, `Presentations`, `PresentationViewer`, `People`, `PersonProfile`, `Specimen`, `Applications`, `Code`, `Geocoder`, `Sitemap`, `Licensing`).
- `ui/` — **the design-system component library** (`Button`, `Badge`, `Panel`, `Table`/`TableCaption`, `Field`, `Input`, `CodeBlock`). Typed props; re-exported from `ui/index.ts` (the barrel the design-sync reads).
- `components/` — composite, app-specific components (`ResearchCard`, `StoryModal`, `PersonCard`, `AppTrackerTable`, `ProofModal`, `WipBanner`).
- `data/` — content as typed data: `research.ts`, `people.ts`, `applications.ts`, `storyGroups.ts`, `presentations.ts`. **Edit these to update content** — pages render from them; nothing is hardcoded per-card.
- `decks/` — slide decks, one component per talk (`BaumolCostDisease.tsx`). Each renders its slides through `components/DeckStage` and owns its own build/animation state.
- `styles/` — global design language: `tokens.css`, `base.css`, `palettes/` (FRBA/USGC), `fonts.css`, and the `styles.css` `@import` root.

`public/` holds static assets served at the site root: `fonts/` (IBM Plex woff2), `images/`, `docs/` (PDFs).

**Styling:** global design tokens (CSS custom properties) live in `src/styles`; component/page styles are **CSS Modules** (`*.module.css`) that reference those `var(--*)` tokens. Import the alias `@` → `src` (e.g. `import { Button } from '@/ui'`).

## Design System

**Typography:** IBM Plex Sans (UI) and IBM Plex Mono (code). Three weights: Light (300), Regular (400), SemiBold (600). Size scale `--font-xs` (12px) … `--font-4xl` (72px) in `tokens.css`. Fonts in `public/fonts/`, declared in `src/styles/fonts.css`.

**Colors:** FRBA primitives in `src/styles/palettes/FRBA_scheme.css` (scales 50–1100); semantic tokens in `src/styles/tokens.css` (`--text-primary`, `--bg`, `--ink-muted`, …). Tokens reference primitives.

**Light/Dark Mode:** CSS `light-dark()` with `color-scheme: light dark` — tokens adapt automatically.

## Important Patterns

**Add a route:**
1. Create `src/pages/Name.tsx` (+ `Name.module.css` if needed).
2. Add a `<Route>` to `App.tsx` (use `React.lazy` if the page is heavy).
3. Add a nav entry to the `NAV` array in `src/layout/Layout.tsx`.

**Add a presentation:**
1. Add an entry to `presentations` in `src/data/presentations.ts` (slug, title, event, date, summary, badges).
2. Build the deck as `src/decks/<Name>.tsx`: an array of `DeckSlide`s (`label`, `screenLabel`, `notes`, `content`) rendered by `<DeckStage>`. Slides are authored against a fixed 1920x1080 canvas that `DeckStage` scales to fit, so slide markup uses inline styles over design tokens.
3. Register the deck component in the `DECKS` map in `src/pages/PresentationViewer.tsx`, keyed by slug.

Decks imported from claude.ai/design (`.dc.html`) are **templates**, not standalone pages: they rely on the Claude Design runtime (`support.js`), which loads React/ReactDOM/Babel from a CDN and compiles `{{ }}` bindings in the browser. Port the slide markup and the `DCLogic` state to React rather than shipping the runtime.

**Add a design-system component:** create `src/ui/<Name>/<Name>.tsx` + `.module.css`, give it typed props, and export it from `src/ui/index.ts`. Composite/page-specific pieces go in `src/components/` instead.

**Routing note:** React Router v6 only matches *full-segment* params — use `/person/:slug`, never `/person-:slug`.

**Styling guidelines:** no inline styles except where the original markup used them; new semantic tokens go in `tokens.css`; component styles in CSS Modules referencing tokens; reuse `@/ui` components rather than re-styling.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds and publishes `dist/` to Pages on push to `main`. Requires repo **Settings → Pages → Source = "GitHub Actions"**.

## Design sync

`src/ui/` is a real component library intended to be synced to claude.ai/design (`/design-sync`) so the design agent builds on-brand UI from these components.
