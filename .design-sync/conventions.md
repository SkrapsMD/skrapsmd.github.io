# Sparks design system — usage conventions

A small, token-driven React component library (IBM Plex typefaces + the Federal Reserve Bank of Atlanta color palette). Flat, engineering aesthetic: **sharp corners** (`--border-radius: 0`), monospace for UI controls/labels, no shadows or gradients.

## Setup — no provider needed
Components are self-contained and need **no provider/wrapper**. They are styled internally; you only need the design system's stylesheet loaded (the bound `styles.css` and its `@import` closure — tokens, fonts, `_ds_bundle.css`). With it loaded, `<Button>`, `<Badge>`, etc. render fully styled. Light/dark mode is automatic via CSS `light-dark()` — do not add a theme toggle or hardcode colors per mode.

## Styling idiom — CSS custom-property tokens (no utility classes)
There is **no class vocabulary and no Tailwind**. Style the components through their props (e.g. `variant`), and style your OWN layout glue with the design tokens as `var(--*)`:

- **Color:** `var(--bg)`, `var(--bg-muted)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-emph)` (FRBA blue), `var(--text-emph-2)` (orange), `var(--ink)`, `var(--border)` (= `1px solid var(--ink)`), `var(--border-muted)`.
- **Type:** `var(--font-sans)` (IBM Plex Sans), `var(--font-mono)` (IBM Plex Mono); sizes `--font-xs` (12px), `--font-sm` (14), `--font-base` (16), `--font-md`, `--font-lg`, `--font-xl` … `--font-4xl` (72).
- **Space / layout:** `--pad` (14px), `--pad-sm` (8), `--pad-lg` (24); `--frame-width` (980px content column).

Never hardcode a hex value — always reference a token so light/dark and brand stay correct.

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
