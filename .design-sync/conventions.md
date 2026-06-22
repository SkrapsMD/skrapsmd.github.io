# Sparks design system — usage conventions

A small, token-driven React component library (IBM Plex typefaces + the Federal Reserve Bank of Atlanta color palette). Flat, engineering aesthetic: **sharp corners** (`--border-radius: 0`), monospace for UI controls/labels, no shadows or gradients.

## Setup — no provider needed
Components are self-contained and need **no provider/wrapper**. They are styled internally; you only need the design system's stylesheet loaded (the bound `styles.css` and its `@import` closure — tokens, fonts, `_ds_bundle.css`). With it loaded, `<Button>`, `<Badge>`, etc. render fully styled. This synced bundle is pinned to the **light** palette (`color-scheme: light`) for consistent rendering; never hardcode colors — always use the tokens.

## Styling idiom — CSS custom-property tokens (no utility classes)
There is **no class vocabulary and no Tailwind**. Style the components through their props (e.g. `variant`), and style your OWN layout glue with the design tokens as `var(--*)`:

- **Color:** `var(--bg)`, `var(--bg-muted)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-emph)` (FRBA blue), `var(--text-emph-2)` (orange), `var(--ink)`, `var(--border)` (= `1px solid var(--ink)`), `var(--border-muted)`.
- **Type:** `var(--font-sans)` (IBM Plex Sans), `var(--font-mono)` (IBM Plex Mono); sizes `--font-xs` (12px), `--font-sm` (14), `--font-base` (16), `--font-md`, `--font-lg`, `--font-xl` … `--font-4xl` (72).
- **Space / layout:** `--pad` (14px), `--pad-sm` (8), `--pad-lg` (24); `--frame-width` (980px content column).

Never hardcode a hex value — always reference a token so light/dark and brand stay correct.

## Color palette (charts, accents, brand fills)
The semantic tokens above are for UI surfaces/text. The raw palette below is for data-viz, charts, and explicit brand color — all available as `var(--name)`.

- **Categorical / plot colors** (use in this order for chart series): `--Res-blue1`, `--Res-orange1`, `--Res-green1`, `--Res-yellow1`, `--Res-pink1`, `--Res-blue2`, `--Res-purple1`, `--Res-teal1`, `--Res-maroon1`, `--Res-blue3`, `--Res-green2`, `--Res-gray1`.
- **Named brand accents:** `--primaryBlue`, `--respectRed`, `--integrityIndigo`, `--teal`, `--shamrockGreen`, `--limeGreen`, `--gold` — each also has `…Light` and `…Dark` (e.g. `--tealDark`, `--goldLight`).
- **Full hue scales (FRBA primary):** families `--atlBlue`, `--atlRed`, `--atlFuchsia`, `--atlIndigo`, `--atlTeal`, `--atlGreen`, `--atlLime`, `--atlGold`, `--atlOrange`, each at steps `50, 100, 200 … 900, 1000, 1100` (e.g. `--atlOrange600`, `--atlBlue900`). Status: `--atlDanger`, `--atlInfo`, `--atlSuccess`, `--atlPrimaryWarning`, `--atlSecondaryWarning`.
- **Secondary "US Graphics Company" scheme:** `--usgc-red`, `--usgc-green`, `--usgc-blue`, `--usgc-cyan`, `--usgc-yellow`, `--usgc-magenta`, `--usgc-purple`, `--usgc-beige` (several have `-2` variants, e.g. `--usgc-blue-2`).

## Where the truth lives
Read these bound files before styling: `styles.css` (the `@import` root → tokens, fonts, `_ds_bundle.css`), plus each component's `<Name>.prompt.md` and `<Name>.d.ts`.

## Components
`Button` (`variant`: default | primary | ghost; pass `href` to render a link), `Badge` (`variant`: highlight | info | success | failure | warning | unsure), `Panel` (`title`, `variant: muted`), `Table` + `TableCaption` (`variant`: compact | borderless, `hoverable`), `Field` + `Input`, `CodeBlock`.

## Idiomatic example
```tsx
<section style={{ maxWidth: 'var(--frame-width)', fontFamily: 'var(--font-sans)' }}>
  <TableCaption category="Research" title="Recent Publications" size="lg" />
  <div style={{ display: 'flex', gap: 'var(--pad-sm)', marginTop: 'var(--pad)' }}>
    <Badge variant="info">Trade Policy</Badge>
    <Badge variant="success">Labor Markets</Badge>
  </div>
  <div style={{ display: 'flex', gap: 'var(--pad-sm)', marginTop: 'var(--pad)' }}>
    <Button variant="primary" href="/paper.pdf">View PDF</Button>
    <Button variant="ghost">Cite</Button>
  </div>
</section>
```
