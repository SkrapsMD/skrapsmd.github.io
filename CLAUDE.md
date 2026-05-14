# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal academic/professional website for Michael Dwight Sparks, hosted on GitHub Pages. This is a pure static site (HTML, CSS, vanilla JavaScript) with no build pipeline, bundler, or package manager.

## Development

No build, test, or lint commands are configured. To preview locally:
```bash
python -m http.server 8000
```
Then open http://localhost:8000 in a browser.

## Architecture

**Single Page Application (SPA)** using hash-based routing:
- `index.html` - Main container with navigation shell and global CSS imports
- `0_code/b_scripts/0_app.js` - Router that:
  - Listens for `hashchange` events
  - Fetches HTML partials via `fetch()`
  - Dynamically injects/removes page-specific CSS using `<link data-page-css>`
  - Contains page-specific interactive logic (e.g., `setupColorCopyListeners()` for specimen page)
- Routes: `#home`, `#research`, `#code`, `#specimen`, `#sitemap`
- Navigation: Clicking `.navbtn` links triggers hash change, router handles the rest

**Directory Structure:**
- `0_code/a_partials/` - HTML page templates loaded dynamically
- `0_code/b_scripts/` - JavaScript application logic
- `1_assets/styles/` - CSS organized in layers (global → layout → components → page-specific)
- `1_assets/styles/b_palettes_and_fonts/` - Color tokens and font files
- `2_docs/` - Documentation, papers, CV, templates

**CSS Layer System:**
1. `00_tokens.css` - Design tokens (semantic CSS custom properties)
2. `01_base.css` - Resets, element defaults, utilities
3. `02_shell.css` - Frame, masthead, footer, navigation
4. `03_components.css` - Buttons, forms, tables
5. `a_partials/*.css` - Page-specific overrides dynamically loaded by router

## Design System

**Typography:** IBM Plex Sans (UI) and IBM Plex Mono (code). Three weights only: Light (300), Regular (400), SemiBold (600). Size scale defined in `00_tokens.css`: `--font-xs` (12px) through `--font-4xl` (72px). Font files hosted locally in `1_assets/styles/b_palettes_and_fonts/FONTS/`.

**Colors:**
- **Tokens:** All color tokens defined in `00_tokens.css` — raw palette (warm neutrals, terra cotta accent, `--ws-gold`, `--ws-teal`) plus semantic mappings (e.g., `--text-primary`, `--bg`, `--ink-muted`)
- Design philosophy: semantic tokens reference raw palette entries for maintainability

**Light/Dark Mode:** Uses CSS `light-dark()` function with `color-scheme: light dark`. All color tokens automatically adapt to user's preferred color scheme.

## Important Patterns

**Adding New Routes:**
1. Create partial in `0_code/a_partials/XX_name.html`
2. Create stylesheet in `1_assets/styles/a_partials/XX_name.css`
3. Add route object to `routes` map in `0_app.js`
4. Add navigation link to `index.html` with matching `data-page` attribute

**Adding Interactive Features:**
- Place page-specific JS functions in `0_app.js`
- Initialize them in `loadPage()` after content injection (see `setupColorCopyListeners()` example)
- Use `data-*` attributes for JS hooks rather than classes

**Styling Guidelines:**
- Never use inline styles - use CSS custom properties
- New semantic tokens go in `00_tokens.css`, not in component files
- Page-specific overrides only - don't duplicate base styles
- Prefer composition over specificity

## Current State

The specimen page (`00_specimen.html`) is a working test file displaying design system elements (colors, typography, tables, etc.). Other pages (Home, Research, Code, Sitemap) display WIP placeholder content loaded from `template/wip.html`.
