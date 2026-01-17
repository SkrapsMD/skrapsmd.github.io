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
- `index.html` - Main container with navigation shell
- `0_code/b_scripts/0_app.js` - Router that fetches HTML partials and injects page-specific CSS
- Routes: `#home`, `#research`, `#code`, `#specimen`, `#sitemap`

**Directory Structure:**
- `0_code/a_partials/` - HTML page templates loaded dynamically
- `0_code/b_scripts/` - JavaScript application logic
- `1_assets/styles/` - CSS organized in layers (global → layout → components → page-specific)
- `1_assets/styles/b_palettes_and_fonts/` - Color tokens and font files
- `2_docs/` - Documentation, papers, CV, templates

**CSS Layer System:**
1. `01_style.css` - CSS custom properties, base styles
2. `02_layout.css` - Frame, masthead, footer, navigation
3. `03_components.css` - Buttons, forms, tables
4. `a_partials/*.css` - Page-specific overrides

## Design System

**Typography:** IBM Plex Sans (UI) and IBM Plex Mono (code). Three weights only: Light (300), Regular (400), SemiBold (600). Size scale: 12, 14, 16, 18, 22, 30, 32, 48, 72. 

**Colors:** Federal Reserve Bank of Atlanta (FRBA) palette defined in `FRBA_scheme.css`. 140+ CSS custom property tokens with scales from 50-1100.

**Light/Dark Mode:** Uses CSS `light-dark()` function with `color-scheme` property.

## Current State

The specimen page (`00_specimen.html`) is a working test file -- to be updated as I continue adding elements and testing out their appearance. Other pages (Home, Research, Code, Sitemap) display WIP placeholder content.
