# design-sync notes — Sparks Design System

Synced project: `Sparks Design System` (`766a7555-4768-40d3-9740-93b24c62bd29`).
Source: the `src/ui/` component library of this Vite + React + TS app (8 components).

## Repo-specific setup (this is an app, not a library package)
- There is **no library `dist/`**. The converter runs in **synth-entry mode** straight from source:
  `--entry ./src/ui/index.ts --node-modules ./node_modules`. (No `buildCmd`.)
- Components are **not auto-discovered** in synth mode → pinned via `cfg.componentSrcMap` (one entry per export; `Table` and `TableCaption` both live in `Table.tsx`).
- Props **cannot be auto-extracted** from source in synth mode (they come out `{ [key: string]: unknown }`), so each component's API is hand-written in `cfg.dtsPropsFor`.
- Tokens are **not an npm package** (`tokensGlob`/`tokensPkg` don't apply). They're injected by appending `.design-sync/ds-tokens.css` (a concatenation of `src/styles/palettes/FRBA_scheme.css` + `USGC_scheme.css` + `tokens.css`) via `cfg.cssEntry` — it lands in `_ds_bundle.css`, which `styles.css` `@import`s.
- **`ds-tokens.css` ends with `:root { color-scheme: light; }` — this is load-bearing.** The site's tokens use `light-dark()`, but the converter's preview cards hardcode `body{background:#fff}`. Without the pin, a dark-OS / dark-themed claude.ai/design viewer makes `light-dark()` return dark values (white text/borders) → white-on-white, invisible buttons. The pin forces the light palette so colors match the white cards. Keep it when regenerating `ds-tokens.css`.
- Fonts: the app's `src/styles/fonts.css` uses absolute `/fonts/*.woff2` paths that the converter can't resolve on disk. `.design-sync/ds-fonts.css` is a path-rewritten copy (`../public/fonts/…`) used via `cfg.extraFonts`.
- Playwright + Chromium for the render check are installed under `.ds-sync/` (gitignored).

## Known render warns
None — 8/8 previews render clean (bad=0, thin=0, variantsIdentical=0).

## Re-sync risks (what can silently go stale)
- **`dtsPropsFor` is a hand-written snapshot of the component props.** If you change a prop in `src/ui/<C>/<C>.tsx`, the synced `.d.ts` will NOT update until you edit `cfg.dtsPropsFor.<C>` to match. This is the #1 thing to re-check on re-sync.
- **`.design-sync/ds-tokens.css` is a static copy** of the three token CSS files. If `src/styles/tokens.css` or the palettes change, regenerate it (cat FRBA + USGC + tokens.css → ds-tokens.css) or the synced tokens drift from the site.
- **`.design-sync/ds-fonts.css` is a static, path-rewritten copy** of `src/styles/fonts.css`. Regenerate it if the font set changes (`sed 's#url("/fonts/#url("../public/fonts/#g'`).
- **Better long-term fix:** add a real library build (e.g. `vite build --lib` + a `.d.ts` emit) and point `--entry` at the built dist. Then prop extraction and tokens become automatic and these three manual snapshots can be dropped. Recorded as a future improvement, not done in this run.

## Re-sync recipe
1. Re-copy staged scripts (`cp -r <skill>/… .ds-sync/`).
2. Regenerate `ds-tokens.css` / `ds-fonts.css` if `src/styles` changed; update `dtsPropsFor` if any `src/ui` prop changed.
3. Fetch the project anchor → `.design-sync/.cache/remote-sync.json`, then:
   `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./src/ui/index.ts --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json`
