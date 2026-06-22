import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Badge, Button, CodeBlock, Table } from '@/ui'
import styles from './Specimen.module.css'

/* =====================================================================
   Design Reference (Specimen) page — faithful React port of the static
   0_code/a_partials/00_specimen.html. Demonstrates the type scale, color
   tokens, the FRBA palette grids (with an interactive WCAG contrast
   overlay and click-to-copy swatches), and the live @/ui component set.
   ===================================================================== */

/* ----------------------------- Shared bits ---------------------------- */

// Section header that preserves the static page's "Category | Title" form
// (the @/ui TableCaption omits the pipe, so we reproduce the markup here).
function SpecCaption({
  category,
  title,
  lg = false,
}: {
  category: string
  title: ReactNode
  lg?: boolean
}) {
  return (
    <div className={`${styles.tableCaption} ${lg ? styles.tableCaptionLg : ''}`.trim()}>
      <span className={styles.tableCaptionCategory}>{category}</span> |{' '}
      <span className={styles.tableCaptionTitle}>{title}</span>
    </div>
  )
}

/* ------------------------- WCAG contrast helpers ---------------------- */
// Math kept IDENTICAL to setupContrastChecker() in 0_app.js.

type Bg = 'white' | 'black'
type Level = 'aaa' | 'aa' | 'aa-large' | 'fail'

function parseRgb(str: string): [number, number, number] | null {
  const m = str.match(/\d+(\.\d+)?/g)
  if (!m) return null
  const [r, g, b] = m.slice(0, 3).map(Number)
  return [r, g, b]
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function ratioVsBackground(L: number, bg: Bg): number {
  const bgL = bg === 'white' ? 1 : 0
  const hi = Math.max(L, bgL)
  const lo = Math.min(L, bgL)
  return (hi + 0.05) / (lo + 0.05)
}

function levelClass(ratio: number): Level {
  if (ratio >= 7) return 'aaa'
  if (ratio >= 4.5) return 'aa'
  if (ratio >= 3) return 'aa-large'
  return 'fail'
}

// Convert a swatch's *rendered* background color to a #rrggbb hex. Copying the
// computed color (not a hand-typed value) keeps the copied hex exactly in sync
// with the token that paints the swatch.
function computedHex(el: HTMLElement | null): string {
  if (!el) return ''
  const rgb = parseRgb(getComputedStyle(el).backgroundColor)
  if (!rgb) return ''
  return '#' + rgb.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
}

const badgeLevelClass: Record<Level, string> = {
  aaa: styles.contrastBadgeAaa,
  aa: styles.contrastBadgeAa,
  'aa-large': styles.contrastBadgeAaLarge,
  fail: styles.contrastBadgeFail,
}

/* ------------------------------ Data ---------------------------------- */

// Full Color Palette rows. `null` entries are the NA gaps (rendered as blank
// swatch cells, excluded from contrast badges — matching the static markup).
type SwatchDef = { hex: string; varName: string } | null

interface PaletteRow {
  name: string
  swatches: SwatchDef[]
}

const sw = (hex: string, varName: string): SwatchDef => ({ hex, varName })

const SCALE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000', '1100']

const PALETTE_ROWS: PaletteRow[] = [
  {
    name: 'Blue',
    swatches: [
      sw('e2edf4', 'atlBlue50'), sw('c2D9e8', 'atlBlue100'), sw('a6c7de', 'atlBlue200'),
      sw('88b7d4', 'atlBlue300'), sw('6da4c9', 'atlBlue400'), sw('5393bf', 'atlBlue500'),
      sw('3581b4', 'atlBlue600'), sw('176FA9', 'atlBlue700'), sw('005d9b', 'atlBlue800'),
      sw('004c7f', 'atlBlue900'), sw('003c65', 'atlBlue1000'), sw('002d4c', 'atlBlue1100'),
    ],
  },
  {
    name: 'Red',
    swatches: [
      sw('f8e5e6', 'atlRed50'), sw('f1ced0', 'atlRed100'), sw('eab6b8', 'atlRed200'),
      sw('e39fa2', 'atlRed300'), sw('dd858a', 'atlRed400'), sw('d66d73', 'atlRed500'),
      sw('ce5158', 'atlRed600'), sw('c53139', 'atlRed700'), sw('b11921', 'atlRed800'),
      sw('93151b', 'atlRed900'), sw('751115', 'atlRed1000'), null,
    ],
  },
  {
    name: 'Fuchsia',
    swatches: [
      sw('f8e0ea', 'atlFuchsia50'), sw('f3ccdd', 'atlFuchsia100'), sw('edb3cc', 'atlFuchsia200'),
      sw('e79bbc', 'atlFuchsia300'), sw('e17fa9', 'atlFuchsia400'), sw('db6598', 'atlFuchsia500'),
      sw('d34682', 'atlFuchsia600'), sw('c5266a', 'atlFuchsia700'), sw('a9205b', 'atlFuchsia800'),
      sw('8b1b4b', 'atlFuchsia900'), sw('6e153c', 'atlFuchsia1000'), sw('53102D', 'atlFuchsia1100'),
    ],
  },
  {
    name: 'Indigo',
    swatches: [
      sw('e7e5f3', 'atlIndigo50'), sw('d7d4ec', 'atlIndigo100'), sw('c5bfe3', 'atlIndigo200'),
      sw('b3abdb', 'atlIndigo300'), sw('9f97d2', 'atlIndigo400'), sw('8f84ca', 'atlIndigo500'),
      sw('7d70c1', 'atlIndigo600'), null, sw('5a4bab', 'atlIndigo800'),
      sw('4a3e8e', 'atlIndigo900'), sw('3a316e', 'atlIndigo1000'), sw('2b2453', 'atlIndigo1100'),
    ],
  },
  {
    name: 'Teal',
    swatches: [
      sw('d7f0f5', 'atlTeal50'), sw('aadfea', 'atlTeal100'), sw('80cfe0', 'atlTeal200'),
      sw('56bfd6', 'atlTeal300'), sw('25acca', 'atlTeal400'), sw('0099bb', 'atlTeal500'),
      sw('0086A4', 'atlTeal600'), sw('00748d', 'atlTeal700'), sw('006278', 'atlTeal800'),
      sw('005264', 'atlTeal900'), sw('00404f', 'atlTeal1000'), sw('002f3a', 'atlTeal1100'),
    ],
  },
  {
    name: 'Green',
    swatches: [
      sw('d0efe5', 'atlGreen50'), sw('a9e2cf', 'atlGreen100'), sw('7ed3b7', 'atlGreen200'),
      sw('53c49f', 'atlGreen300'), sw('20b383', 'atlGreen400'), sw('00a16c', 'atlGreen500'),
      sw('008d5f', 'atlGreen600'), sw('007a52', 'atlGreen700'), sw('006746', 'atlGreen800'),
      sw('00553A', 'atlGreen900'), sw('00432d', 'atlGreen1000'), sw('003222', 'atlGreen1100'),
    ],
  },
  {
    name: 'Lime',
    swatches: [
      sw('dfeac6', 'atlLime50'), sw('cbdea3', 'atlLime100'), sw('b1cd76', 'atlLime200'),
      sw('9abd4b', 'atlLime300'), sw('7fac1c', 'atlLime400'), sw('6a9b00', 'atlLime500'),
      sw('5d8700', 'atlLime600'), sw('507500', 'atlLime700'), sw('446300', 'atlLime800'),
      sw('385100', 'atlLime900'), sw('2c4000', 'atlLime1000'), sw('212f00', 'atlLime1100'),
    ],
  },
  {
    name: 'Gold',
    swatches: [
      sw('ffe89a', 'atlGold50'), sw('ffd138', 'atlGold100'), sw('f3bb00', 'atlGold200'),
      sw('ddaa00', 'atlGold300'), sw('c59700', 'atlGold400'), sw('b08700', 'atlGold500'),
      sw('9a7600', 'atlGold600'), sw('846600', 'atlGold700'), sw('715600', 'atlGold800'),
      sw('5d4700', 'atlGold900'), sw('493800', 'atlGold1000'), sw('362900', 'atlGold1100'),
    ],
  },
  {
    name: 'Orange',
    swatches: [
      sw('fbe2d0', 'atlOrange50'), sw('f9cdaf', 'atlOrange100'), sw('f6b588', 'atlOrange200'),
      sw('f39d61', 'atlOrange300'), sw('f08033', 'atlOrange400'), sw('e7660e', 'atlOrange500'),
      sw('ca590c', 'atlOrange600'), sw('ae4d0a', 'atlOrange700'), sw('944209', 'atlOrange800'),
      sw('7a3607', 'atlOrange900'), sw('602b06', 'atlOrange1000'), sw('472004', 'atlOrange1100'),
    ],
  },
]

// Plot palette swatches: [data-color hex, css var, displayed hex label, label dark/light]
interface PlotSwatch {
  hex: string
  varName: string
  label: string
  labelLight: boolean
  top?: boolean
  rowTop?: boolean
}

const PLOT_BASIC: PlotSwatch[] = [
  { hex: '3581b4', varName: 'Res-blue1', label: '#3581b4', labelLight: true, top: true },
  { hex: 'ca590f', varName: 'Res-orange1', label: '#ca590f', labelLight: false, top: true },
  { hex: '7fac1c', varName: 'Res-green1', label: '#7fac1c', labelLight: false, top: true },
  { hex: 'f3bb00', varName: 'Res-yellow1', label: '#f3bb00', labelLight: false, top: true },
  { hex: 'd34682', varName: 'Res-pink1', label: '#d34682', labelLight: false },
  { hex: '56bfd6', varName: 'Res-blue2', label: '#56bfd6', labelLight: false },
  { hex: '4a3e8e', varName: 'Res-purple1', label: '#4a3e8e', labelLight: true },
  { hex: '53c49f', varName: 'Res-teal1', label: '#53c49f', labelLight: false },
  { hex: '580d10', varName: 'Res-maroon1', label: '#580d10', labelLight: true },
  { hex: '006278', varName: 'Res-blue3', label: '#006278', labelLight: true },
  { hex: '385100', varName: 'Res-green2', label: '#385100', labelLight: true },
  { hex: '414141', varName: 'Res-gray1', label: '#414141', labelLight: true },
]

const PLOT_DARK: PlotSwatch[] = [
  { hex: '6da4c9', varName: 'atlBlue400', label: '#6da4c9', labelLight: false, rowTop: true },
  { hex: 'f08033', varName: 'atlOrange400', label: '#f08033', labelLight: false, rowTop: true },
  { hex: 'e17fa9', varName: 'atlFuchsia400', label: '#e17fa9', labelLight: false, rowTop: true },
  { hex: '9f97d2', varName: 'atlIndigo400', label: '#9f97d2', labelLight: false, rowTop: true },
  { hex: '53c49f', varName: 'atlGreen300', label: '#53c49f', labelLight: false },
  { hex: 'd66d73', varName: 'atlRed500', label: '#d66d73', labelLight: false },
  { hex: 'ddaa00', varName: 'atlGold300', label: '#ddaa00', labelLight: false },
  { hex: '80cfe0', varName: 'atlTeal200', label: '#80cfe0', labelLight: false },
]

const FONT_WEIGHTS: { label: string; cls: string; synthesized?: boolean }[] = [
  { label: '100', cls: styles.fw100, synthesized: true },
  { label: '200', cls: styles.fw200, synthesized: true },
  { label: '300', cls: styles.fw300 },
  { label: '400', cls: styles.fw400 },
  { label: '450', cls: styles.fw450, synthesized: true },
  { label: '500', cls: styles.fw500, synthesized: true },
  { label: '600', cls: styles.fw600 },
  { label: '700', cls: styles.fw700, synthesized: true },
]

const FONT_SIZES: { label: string; cls: string }[] = [
  { label: '72', cls: styles.fs4xl },
  { label: '48', cls: styles.fs3xl },
  { label: '36', cls: styles.fs2xl },
  { label: '30', cls: styles.fsXl },
  { label: '24', cls: styles.fsLg },
  { label: '18', cls: styles.fsMd },
  { label: '16', cls: styles.fsBase },
  { label: '14', cls: styles.fsSm },
  { label: '12', cls: styles.fsXs },
]

/* ----------------------- Click-to-copy swatch ------------------------ */
// Reproduces setupColorCopyListeners(): click copies the hex, shows "Copied!"
// for ~800ms. Applied to every element that carried a data-color (including
// the NA row labels, which copy the literal "NA" — same as the original).

function useCopyFeedback(): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const copy = useCallback((text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(false), 800)
      })
      .catch((err) => console.error('Failed to copy:', err))
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return { copied, copy }
}

const copiedOverlayStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: 'white',
  textShadow: '1px 1px 2px black',
  fontWeight: 600,
  fontSize: 12,
}

/* ----------------------------- Component ----------------------------- */

export default function Specimen() {
  const [contrastActive, setContrastActive] = useState(false)
  const [bg, setBg] = useState<Bg>('white')

  // Refs to every contrast-eligible swatch (full palette + plot palette), so
  // we can read each one's *rendered* background and compute its ratio exactly
  // as the static page did via getComputedStyle.
  const swatchRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  // key -> { level, text } once measured.
  const [badges, setBadges] = useState<Record<string, { level: Level; text: string }>>({})

  const registerSwatch = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) swatchRefs.current.set(key, el)
    else swatchRefs.current.delete(key)
  }, [])

  // Recompute badges whenever the overlay turns on or the background basis
  // changes. Reads the live computed background of each swatch element.
  useEffect(() => {
    if (!contrastActive) {
      setBadges({})
      return
    }
    const next: Record<string, { level: Level; text: string }> = {}
    swatchRefs.current.forEach((el, key) => {
      const rgb = parseRgb(getComputedStyle(el).backgroundColor)
      if (!rgb) return
      const ratio = ratioVsBackground(relLuminance(rgb), bg)
      next[key] = { level: levelClass(ratio), text: ratio.toFixed(1) + ':1' }
    })
    setBadges(next)
  }, [contrastActive, bg])

  return (
    <>
      {/* ===================== FONT SPECIMEN HEADER ===================== */}
      <section className={styles.specimenGrid}>
        <div>
          <SpecCaption category="Design Reference" title="Font Specimen" lg />
          <div className={`muted small ${styles.specDesc}`}>
            Typographic examples of the font-types used throughout this site. Both fonts are members of IBM's beautiful
            "Plex" family &mdash; chosen for their clarity, legibility, versatility, and timeless design. Read more about
            the "Plex" typeface family{' '}
            <a
              href="https://github.com/IBM/plex/releases/tag/%40ibm%2Fplex-mono%401.1.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>
            .
          </div>
        </div>

        <div>
          <Table variant="compact">
            <tbody>
              <tr>
                <th scope="row">Fonts</th>
                <td>
                  <a
                    href="https://github.com/IBM/plex/releases/tag/@ibm/plex-sans@1.1.0"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    IBM Plex Sans
                  </a>
                  <br />
                  <a
                    href="https://github.com/IBM/plex/releases/tag/%40ibm%2Fplex-mono%401.1.0"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    IBM Plex Mono
                  </a>
                </td>
              </tr>
              <tr><th scope="row">Weights</th><td>300 · 400 · 600</td></tr>
              <tr><th scope="row">Sizes</th><td className="mono">12·14·16·18·24·30·36·48·72</td></tr>
              <tr><th scope="row">Styles</th><td>Normal · Italic</td></tr>
              <tr><th scope="row">Date</th><td className="mono">2026-01-17</td></tr>
            </tbody>
          </Table>
        </div>
      </section>

      <div className={styles.rule} />

      {/* ===================== FONT WEIGHT WATERFALL ===================== */}
      <SpecCaption category="Font Specimen" title="FONT WEIGHT" />
      <Table variant="borderless">
        <thead>
          <tr>
            <th>Font Weight</th>
            <th>IBM Plex Sans (Normal)</th>
            <th>IBM Plex Sans (Italic)</th>
            <th>IBM Plex Mono (Normal)</th>
            <th>IBM Plex Mono (Italic)</th>
          </tr>
        </thead>
        <tbody>
          {FONT_WEIGHTS.map((w) => (
            <tr key={w.label}>
              <td className="mono">
                [{w.label}]
                {w.synthesized && (
                  <abbr className="muted" title="browser-synthesized; not loaded via @font-face">
                    {' '}*
                  </abbr>
                )}
              </td>
              <td className={`${styles.fontSans} ${w.cls}`}>IBM Plex Sans</td>
              <td className={`${styles.fontSansI} ${w.cls}`}>IBM Plex Sans</td>
              <td className={`${styles.fontMono} ${w.cls}`}>IBM Plex Mono</td>
              <td className={`${styles.fontMonoI} ${w.cls}`}>IBM Plex Mono</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className={styles.rule} />

      {/* ===================== FONT SIZE (NORMAL) ===================== */}
      <SpecCaption category="Font Specimen" title="FONT SIZE (NORMAL)" />
      <Table variant="borderless">
        <thead>
          <tr>
            <th>Font Size</th>
            <th>IBM Plex Sans</th>
            <th>IBM Plex Mono</th>
          </tr>
        </thead>
        <tbody>
          {FONT_SIZES.map((s) => (
            <tr key={s.label}>
              <td className="mono">[{s.label}]</td>
              <td className={`${styles.sizeSans} ${s.cls}`}>IBM Plex</td>
              <td className={`${styles.sizeMono} ${s.cls}`}>IBM Plex</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className={styles.rule} />

      {/* ===================== FONT SIZE (ITALIC) ===================== */}
      <SpecCaption category="Font Specimen" title="FONT SIZE (ITALIC)" />
      <Table variant="borderless">
        <thead>
          <tr>
            <th>Font Size</th>
            <th>IBM Plex Sans</th>
            <th>IBM Plex Mono</th>
          </tr>
        </thead>
        <tbody>
          {FONT_SIZES.map((s) => (
            <tr key={s.label}>
              <td className="mono">[{s.label}]</td>
              <td className={`${styles.sizeSansI} ${s.cls}`}>IBM Plex</td>
              <td className={`${styles.sizeMonoI} ${s.cls}`}>IBM Plex</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className={`${styles.rule} ${styles.ruleSpaced}`} />

      {/* =============== TYPE STYLING IN LIGHT & DARK MODE =============== */}
      <section className={styles.specBlock}>
        <SpecCaption category="Font Specimen" title="Type Styling in Light & Dark Mode" />
        <div className={styles.tokenGrid}>
          <div className={styles.tokenGridHeader}>Variable</div>
          <div className={`${styles.tokenGridHeader} ${styles.tokenGridHeaderCenter}`}>Light Mode</div>
          <div className={`${styles.tokenGridHeader} ${styles.tokenGridHeaderCenter}`}>Dark Mode</div>

          <ColorTokenRow
            name="--ink / --text-primary"
            light={<div style={{ color: 'var(--black)', fontSize: 'var(--font-base)' }}>Primary text content</div>}
            lightBg="var(--white)"
            dark={<div style={{ color: 'var(--white)', fontSize: 'var(--font-base)' }}>Primary text content</div>}
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="--ink-muted / --text-secondary"
            light={<div style={{ color: 'var(--darkGray)', fontSize: 'var(--font-base)' }}>Secondary text content</div>}
            lightBg="var(--white)"
            dark={<div style={{ color: 'var(--medGray)', fontSize: 'var(--font-base)' }}>Secondary text content</div>}
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="--text-emph"
            light={<div style={{ color: 'var(--atlBlue900)', fontSize: 'var(--font-base)' }}>Emphasized text</div>}
            lightBg="var(--white)"
            dark={<div style={{ color: 'var(--atlBlue300)', fontSize: 'var(--font-base)' }}>Emphasized text</div>}
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="--text-emph-hover"
            light={<div style={{ color: 'var(--atlBlue700)', fontSize: 'var(--font-base)' }}>Emphasized text (hover)</div>}
            lightBg="var(--white)"
            dark={<div style={{ color: 'var(--atlBlue400)', fontSize: 'var(--font-base)' }}>Emphasized text (hover)</div>}
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="--text-emph-2"
            light={<div style={{ color: 'var(--atlOrange800)', fontSize: 'var(--font-base)' }}>Secondary emphasis</div>}
            lightBg="var(--white)"
            dark={<div style={{ color: 'var(--atlOrange300)', fontSize: 'var(--font-base)' }}>Secondary emphasis</div>}
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="--text-emph-2-hover"
            light={<div style={{ color: 'var(--atlOrange700)', fontSize: 'var(--font-base)' }}>Secondary emphasis (hover)</div>}
            lightBg="var(--white)"
            dark={<div style={{ color: 'var(--atlOrange300)', fontSize: 'var(--font-base)' }}>Secondary emphasis (hover)</div>}
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="Hyperlink"
            light={
              <div style={{ fontSize: 'var(--font-base)' }}>
                <span style={{ color: 'var(--atlBlue900)', textDecoration: 'underline' }}>This is a link</span>
              </div>
            }
            lightBg="var(--white)"
            dark={
              <div style={{ fontSize: 'var(--font-base)' }}>
                <span style={{ color: 'var(--atlBlue400)', textDecoration: 'underline' }}>This is a link</span>
              </div>
            }
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="--text-highlight"
            light={
              <div style={{ fontSize: 'var(--font-base)', color: 'var(--black)' }}>
                <span style={{ background: 'var(--atlGold100)', padding: '2px 4px' }}>Highlighted text</span>
              </div>
            }
            lightBg="var(--white)"
            dark={
              <div style={{ fontSize: 'var(--font-base)', color: 'var(--white)' }}>
                <span style={{ background: 'var(--atlGold800)', padding: '2px 4px' }}>Highlighted text</span>
              </div>
            }
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="--text-highlight-2"
            light={
              <div style={{ fontSize: 'var(--font-base)', color: 'var(--black)' }}>
                <span style={{ background: 'var(--atlBlue100)', padding: '2px 4px' }}>Highlighted text</span>
              </div>
            }
            lightBg="var(--white)"
            dark={
              <div style={{ fontSize: 'var(--font-base)', color: 'var(--white)' }}>
                <span style={{ background: 'var(--atlBlue900)', padding: '2px 4px' }}>Highlighted text</span>
              </div>
            }
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="--text-highlight-3"
            light={
              <div style={{ fontSize: 'var(--font-base)', color: 'var(--black)' }}>
                <span style={{ background: 'var(--atlGreen100)', padding: '2px 4px' }}>Highlighted text</span>
              </div>
            }
            lightBg="var(--white)"
            dark={
              <div style={{ fontSize: 'var(--font-base)', color: 'var(--white)' }}>
                <span style={{ background: 'var(--atlGreen800)', padding: '2px 4px' }}>Highlighted text</span>
              </div>
            }
            darkBg="var(--charcoal)"
          />
          <ColorTokenRow
            name="--active-indicator"
            light={<div style={{ color: 'var(--atlRed800)', fontSize: 'var(--font-base)' }}>Active state</div>}
            lightBg="var(--white)"
            dark={<div style={{ color: 'var(--atlRed300)', fontSize: 'var(--font-base)' }}>Active state</div>}
            darkBg="var(--charcoal)"
          />
        </div>
      </section>

      <div className={`${styles.rule} ${styles.ruleSpaced}`} />

      {/* ===================== COLOR SPECIMEN HEADER ===================== */}
      <section className={styles.specimenGrid}>
        <div>
          <SpecCaption category="Design Reference" title="Color Specimen" lg />
          <div className={`muted small ${styles.specDesc}`}>
            The Atlanta Fed color palette &mdash; used throughout this site for both UI and research chart styling.
            The research plot palette has been extended by the author to include dark-mode variants.
          </div>
        </div>
        <div>
          <Table variant="compact">
            <tbody>
              <tr>
                <th scope="row">Source</th>
                <td>
                  <a href="https://www.atlantafed.org/" target="_blank" rel="noopener noreferrer">
                    Federal Reserve Bank of Atlanta
                  </a>
                </td>
              </tr>
              <tr><th scope="row">Palettes</th><td>Standard (v1.1) · Research Plots(v1.1)</td></tr>
              <tr><th scope="row">Date</th><td className="mono">2026-01-20</td></tr>
            </tbody>
          </Table>
        </div>
      </section>

      {/* ===================== CONTRAST CONTROLS ===================== */}
      <div className={styles.contrastControls}>
        <Button
          aria-pressed={contrastActive}
          onClick={() => setContrastActive((v) => !v)}
        >
          {contrastActive ? 'Hide Contrast Ratios' : 'Show Contrast Ratios'}
        </Button>
        <div
          className={styles.contrastBgSwitch}
          role="radiogroup"
          aria-label="Background color for contrast calculation"
        >
          <span className={styles.contrastBgSwitchCaption}>Background:</span>
          <button
            className={`${styles.contrastBgSwitchOption} ${bg === 'white' ? styles.contrastBgSwitchOptionActive : ''}`.trim()}
            type="button"
            role="radio"
            aria-checked={bg === 'white'}
            onClick={() => setBg('white')}
          >
            White
          </button>
          <button
            className={`${styles.contrastBgSwitchOption} ${bg === 'black' ? styles.contrastBgSwitchOptionActive : ''}`.trim()}
            type="button"
            role="radio"
            aria-checked={bg === 'black'}
            onClick={() => setBg('black')}
          >
            Black
          </button>
        </div>
      </div>

      {contrastActive && (
        <div className={styles.contrastKey}>
          <div className={styles.contrastKeyLegend}>
            <div className={styles.contrastKeyItem}>
              <span className={`${styles.contrastKeyDot} ${styles.contrastKeyDotAaa}`} />
              <span><strong>AAA</strong> &mdash; normal text &ge;7:1</span>
            </div>
            <div className={styles.contrastKeyItem}>
              <span className={`${styles.contrastKeyDot} ${styles.contrastKeyDotAa}`} />
              <span><strong>AA</strong> &mdash; normal text &ge;4.5:1 / AAA large text &ge;4.5:1</span>
            </div>
            <div className={styles.contrastKeyItem}>
              <span className={`${styles.contrastKeyDot} ${styles.contrastKeyDotAaLarge}`} />
              <span><strong>AA large</strong> &mdash; large text &ge;3:1 / UI &amp; graphics &ge;3:1 (WCAG 2.1)</span>
            </div>
            <div className={styles.contrastKeyItem}>
              <span className={`${styles.contrastKeyDot} ${styles.contrastKeyDotFail}`} />
              <span><strong>Fail</strong> &mdash; below 3:1</span>
            </div>
          </div>
          <div className={`${styles.contrastKeyNotes} small muted`}>
            WCAG 2.0 Level AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text.
            WCAG 2.1 requires 3:1 for graphics and user-interface components. WCAG Level AAA requires 7:1 for
            normal text and 4.5:1 for large text. Ratios are computed for each color used as a font color on the
            selected background; the switch changes only the calculation basis, not the page background.
          </div>
          <div className={styles.contrastKeyFootnote}>
            Large text is defined as 14 point (18.66px) and bold, or larger, or 18 point (24px) not bold, or larger.
          </div>
        </div>
      )}

      {/* ===================== FULL COLOR PALETTE GRID ===================== */}
      <section className={styles.specBlock}>
        <SpecCaption category="Color Specimen" title="Full Color Palette" />
        <div className={`${styles.colorGrid} ${contrastActive ? styles.contrastActive : ''}`.trim()}>
          <div className={styles.colorGridHeader} />
          {SCALE_LABELS.map((l) => (
            <div key={l} className={styles.colorGridHeaderLabel}>{l}</div>
          ))}

          {PALETTE_ROWS.map((row) => (
            <RowFragment key={row.name}>
              <CopyableLabel className={styles.colorGridRowLabel} color="NA">
                {row.name}
              </CopyableLabel>
              {row.swatches.map((s, i) => {
                if (s === null) {
                  return <div key={`${row.name}-na-${i}`} className={styles.colorGridSwatchNa} />
                }
                const key = `palette-${row.name}-${i}`
                return (
                  <PaletteSwatch
                    key={key}
                    hex={s.hex}
                    varName={s.varName}
                    register={registerSwatch(key)}
                    badge={badges[key]}
                  />
                )
              })}
            </RowFragment>
          ))}
        </div>
      </section>

      <div className={`${styles.rule} ${styles.ruleSpaced}`} />

      {/* ===================== LIGHT PLOT PALETTE GRID ===================== */}
      <section className={styles.specimenGridMt}>
        <SpecCaption category="Color Specimen" title="Light Plot Palette " />
        <div className={styles.plotGrid}>
          <div className={`${styles.plotGridLabel} ${styles.plotGridLabelBasic}`}>Basic Palette</div>
          {PLOT_BASIC.map((s, i) => {
            const key = `plot-basic-${i}`
            return (
              <PlotSwatchCell key={key} swatch={s} register={registerSwatch(key)} badge={badges[key]} />
            )
          })}

          <div className={`${styles.plotGridLabel} ${styles.plotGridLabelDark}`}>Dark Plot Palette</div>
          {PLOT_DARK.map((s, i) => {
            const key = `plot-dark-${i}`
            return (
              <PlotSwatchCell key={key} swatch={s} register={registerSwatch(key)} badge={badges[key]} />
            )
          })}
        </div>
      </section>

      <div className={`${styles.rule} ${styles.ruleSpaced}`} />

      {/* ===================== UI COMPONENT SPECIMEN HEADER ===================== */}
      <section className={`${styles.specimenGrid} ${styles.specimenGridMt}`}>
        <div>
          <SpecCaption category="Design Reference" title="UI Component Specimen" lg />
          <div className={`muted small ${styles.specDesc}`}>
            Interactive and content components used throughout the site. These include buttons for actions, cards for publications and blog posts,
            text hierarchy for content sections, and code blocks for technical documentation. Each component is designed to work across both light
            and dark modes while maintaining the site's engineering aesthetic.
          </div>
        </div>
        <div>
          <Table variant="compact">
            <tbody>
              <tr><th scope="row">Components</th><td>Buttons · Cards · Text · Code</td></tr>
              <tr><th scope="row">Variants</th><td>Default · Primary · Ghost · Disabled</td></tr>
              <tr><th scope="row">Date</th><td className="mono">2026-01-20</td></tr>
            </tbody>
          </Table>
        </div>
      </section>

      <div className={styles.rule} />

      {/* ===================== BUTTONS ===================== */}
      <SpecCaption category="UI Specimen" title="BUTTONS" />
      <section className={styles.uiSpecSection}>
        <div className={styles.uiSpecGrid}>
          <div className={styles.uiSpecGridLabel}>
            <span className="mono" style={{ fontSize: 'var(--font-xs)' }}>Default</span>
          </div>
          <div className={styles.uiSpecGridDemo}>
            <Button>Cancel</Button>
            <Button>Download PDF</Button>
            <Button>View Details</Button>
          </div>

          <div className={styles.uiSpecGridLabel}>
            <span className="mono" style={{ fontSize: 'var(--font-xs)' }}>Primary</span>
          </div>
          <div className={styles.uiSpecGridDemo}>
            <Button variant="primary">Submit</Button>
            <Button variant="primary">Read Paper</Button>
            <Button variant="primary">Get Started</Button>
          </div>

          <div className={styles.uiSpecGridLabel}>
            <span className="mono" style={{ fontSize: 'var(--font-xs)' }}>Ghost</span>
          </div>
          <div className={styles.uiSpecGridDemo}>
            <Button variant="ghost">Learn More</Button>
            <Button variant="ghost">View Source</Button>
            <Button variant="ghost">Contact</Button>
          </div>

          <div className={styles.uiSpecGridLabel}>
            <span className="mono" style={{ fontSize: 'var(--font-xs)' }}>Disabled</span>
          </div>
          <div className={styles.uiSpecGridDemo}>
            <Button disabled>Unavailable</Button>
            <Button variant="primary" disabled>Coming Soon</Button>
            <Button variant="ghost" disabled>Archived</Button>
          </div>
        </div>
      </section>

      <div className={styles.rule} />

      {/* ===================== PUBLICATION CITATION CARDS ===================== */}
      <SpecCaption category="UI Specimen" title="PUBLICATION CITATION CARDS" />
      <section className={styles.uiSpecSectionNarrow}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Lorem Ipsum Dolor Sit Amet Consectetur: A Methodological Approach
          </div>
          <div className={styles.cardMeta}>
            <span className="mono">Author, A.B.</span> · <span>Journal Name</span> · <span className="mono">2024</span>
          </div>
          <div className={styles.cardBody}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
            dolor in reprehenderit in voluptate velit esse cillum dolore.
          </div>
          <div className={styles.cardBadges}>
            <Badge variant="info">Topic One</Badge>
            <Badge variant="info">Topic Two</Badge>
            <Badge variant="info">Methodology</Badge>
          </div>
          <div className={styles.cardActions}>
            <Button variant="primary">View PDF</Button>
            <Button>DOI Link</Button>
            <Button variant="ghost">Cite</Button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Consectetur Adipiscing Elit Sed Eiusmod Tempor Incididunt
          </div>
          <div className={styles.cardMeta}>
            <span className="mono">Author, A.B. &amp; Coauthor, C.D.</span> · <span>Journal Name</span> · <span className="mono">2023</span>
          </div>
          <div className={styles.cardBody}>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat.
          </div>
          <div className={styles.cardBadges}>
            <Badge variant="success">Topic Three</Badge>
            <Badge variant="success">Topic Four</Badge>
          </div>
          <div className={styles.cardActions}>
            <Button variant="primary">View PDF</Button>
            <Button>DOI Link</Button>
            <Button variant="ghost">Cite</Button>
          </div>
        </div>
      </section>

      <div className={styles.rule} />

      {/* ===================== BLOG POST CARDS ===================== */}
      <SpecCaption category="UI Specimen" title="BLOG POST CARDS" />
      <section className={styles.uiSpecSectionNarrow}>
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitle}>Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing</div>
            <span className={`mono ${styles.cardDate}`}>2026-01-15</span>
          </div>
          <div className={styles.cardBody}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure
            dolor in reprehenderit in voluptate.
          </div>
          <div className={styles.cardBadges}>
            <Badge variant="highlight">Category One</Badge>
            <Badge variant="highlight">Category Two</Badge>
          </div>
          <div className={styles.cardAction}>
            <Button variant="ghost">Read More →</Button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitle}>Sed Do Eiusmod Tempor Incididunt Ut Labore</div>
            <span className={`mono ${styles.cardDate}`}>2026-01-08</span>
          </div>
          <div className={styles.cardBody}>
            Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
            in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident.
          </div>
          <div className={styles.cardBadges}>
            <Badge variant="info">Tag One</Badge>
            <Badge variant="info">Tag Two</Badge>
            <Badge variant="info">Tag Three</Badge>
          </div>
          <div className={styles.cardAction}>
            <Button variant="ghost">Read More →</Button>
          </div>
        </div>
      </section>

      <div className={styles.rule} />

      {/* ===================== TEXT CONTENT HIERARCHY ===================== */}
      <SpecCaption category="UI Specimen" title="TEXT CONTENT HIERARCHY" />
      <section className={styles.uiSpecSectionNarrow}>
        <div className={styles.card}>
          <h1 className={styles.h1}>Heading Level 1</h1>
          <h2 className={styles.h2}>Heading Level 2</h2>
          <h3 className={styles.h3}>Heading Level 3</h3>
          <h4 className={styles.h4}>Heading Level 4</h4>

          <p className={styles.p}>
            This is a standard paragraph demonstrating body text styling. The text maintains comfortable line height and spacing for extended reading.
            Economic research often requires presenting complex arguments in accessible prose, balancing technical precision with clarity.
          </p>

          <p className={styles.p}>
            Inline text styles include <strong>bold emphasis</strong>, <em>italic emphasis</em>, and <code>inline code snippets</code>.
            You can also include{' '}
            <a href="#" style={{ textDecoration: 'underline' }}>hyperlinks to external resources</a>{' '}
            or internal references.
          </p>

          <blockquote className={styles.blockquote}>
            "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design."
            <div className={styles.blockquoteAttr}>— F.A. Hayek</div>
          </blockquote>

          <ul className={styles.list}>
            <li className={styles.listItem}>Unordered list item demonstrating enumeration</li>
            <li className={styles.listItem}>Lists are useful for presenting multiple related points</li>
            <li className={styles.listItem}>They maintain consistent spacing and alignment</li>
          </ul>

          <ol className={styles.list}>
            <li className={styles.listItem}>Ordered lists provide sequential structure</li>
            <li className={styles.listItem}>Particularly useful for methodological steps</li>
            <li className={styles.listItem}>Or presenting ranked findings</li>
          </ol>
        </div>
      </section>

      <div className={styles.rule} />

      {/* ===================== INLINE TEXT STYLE TOKENS ===================== */}
      <SpecCaption category="UI Specimen" title="INLINE TEXT STYLE TOKENS" />
      <section className={styles.uiSpecSection}>
        <div className={styles.tokenGrid}>
          <div className={styles.tokenGridHeader}>Token Name</div>
          <div className={styles.tokenGridHeader}>Example</div>
          <div className={styles.tokenGridHeader}>Usage</div>

          <div className={styles.tokenGridLabel}>
            <div className="mono" style={{ fontSize: 'var(--font-xs)' }}>--text-strong</div>
          </div>
          <div className={styles.tokenGridLabel}>
            <div style={{ fontSize: 'var(--font-base)' }}>This is <strong>bold text</strong> in a sentence.</div>
          </div>
          <div className={styles.tokenGridLabel} style={{ fontSize: 'var(--font-xs)' }}>
            Applied to &lt;strong&gt; and &lt;b&gt; tags
          </div>

          <div className={styles.tokenGridLabel}>
            <div className="mono" style={{ fontSize: 'var(--font-xs)' }}>--text-italic</div>
          </div>
          <div className={styles.tokenGridLabel}>
            <div style={{ fontSize: 'var(--font-base)' }}>This is <em>italic text</em> in a sentence.</div>
          </div>
          <div className={styles.tokenGridLabel} style={{ fontSize: 'var(--font-xs)' }}>
            Applied to &lt;em&gt; and &lt;i&gt; tags
          </div>

          <div className={styles.tokenGridLabel}>
            <div className="mono" style={{ fontSize: 'var(--font-xs)' }}>--text-link</div>
          </div>
          <div className={styles.tokenGridLabel}>
            <div style={{ fontSize: 'var(--font-base)' }}>Read more on <a href="#specimen">this topic</a>.</div>
          </div>
          <div className={styles.tokenGridLabel} style={{ fontSize: 'var(--font-xs)' }}>
            Applied to &lt;a&gt; tags
          </div>

          <div className={styles.tokenGridLabel}>
            <div className="mono" style={{ fontSize: 'var(--font-xs)' }}>--code-bg</div>
          </div>
          <div className={styles.tokenGridLabel}>
            <div style={{ fontSize: 'var(--font-base)' }}>Use <code>var(--text-primary)</code> for colors.</div>
          </div>
          <div className={styles.tokenGridLabel} style={{ fontSize: 'var(--font-xs)' }}>
            Background for inline &lt;code&gt;
          </div>

          <div className={styles.tokenGridLabel}>
            <div className="mono" style={{ fontSize: 'var(--font-xs)' }}>--code-block-bg</div>
          </div>
          <div className={styles.tokenGridLabel}>
            <CodeBlock className={styles.flush}>x = solve(A, b)</CodeBlock>
          </div>
          <div className={styles.tokenGridLabel} style={{ fontSize: 'var(--font-xs)' }}>
            Background for .code-block
          </div>

          <div className={styles.tokenGridLabel}>
            <div className="mono" style={{ fontSize: 'var(--font-xs)' }}>--blockquote-border</div>
          </div>
          <div className={styles.tokenGridLabel}>
            <blockquote className={styles.blockquoteDemo}>"Quote example"</blockquote>
          </div>
          <div className={styles.tokenGridLabel} style={{ fontSize: 'var(--font-xs)' }}>
            Left border for &lt;blockquote&gt;
          </div>

          <div className={styles.tokenGridLabel}>
            <div className="mono" style={{ fontSize: 'var(--font-xs)' }}>--blockquote-text</div>
          </div>
          <div className={styles.tokenGridLabel}>
            <blockquote className={styles.blockquoteDemo}>"Quote text color"</blockquote>
          </div>
          <div className={styles.tokenGridLabel} style={{ fontSize: 'var(--font-xs)' }}>
            Text color for &lt;blockquote&gt;
          </div>
        </div>
      </section>

      <div className={styles.rule} />

      {/* ===================== CODE BLOCKS ===================== */}
      <SpecCaption category="UI Specimen" title="CODE BLOCKS" />
      <section className={styles.uiSpecSectionNarrow}>
        <div className={styles.card}>
          <div className={styles.subhead}>Inline Code</div>
          <p className={`${styles.p} ${styles.pMb16}`}>
            Use inline code for short snippets like <code>var(--text-primary)</code> or function names like <code>loadPage()</code>.
          </p>

          <div className={styles.subhead}>Code Block Example (Julia)</div>
          <CodeBlock>{`function solve_model(params::ModelParams)
    # Initialize state space
    n_states = params.n_capital * params.n_productivity

    # Solve Bellman equation via value function iteration
    V = zeros(n_states)
    policy = zeros(Int, n_states)

    converged = false
    iter = 0
    while !converged && iter < params.max_iter
        V_new, policy = bellman_operator(V, params)
        converged = maximum(abs.(V_new - V)) < params.tol
        V = V_new
        iter += 1
    end

    return V, policy
end`}</CodeBlock>

          <div className={`${styles.subhead} ${styles.subheadSpaced}`}>Code Block Example (R)</div>
          <CodeBlock>{`# Estimate structural VAR model
library(vars)

# Prepare data
data <- cbind(gdp_growth, inflation, fed_funds)
var_model <- VAR(data, p = 4, type = "const")

# Identify structural shocks via Cholesky decomposition
svar_model <- id.chol(var_model)

# Generate impulse response functions
irf_results <- irf(svar_model, n.ahead = 20, ci = 0.95)`}</CodeBlock>
        </div>
      </section>

      <div className={styles.rule} />

      {/* ===================== BADGES & TAGS ===================== */}
      <SpecCaption category="UI Specimen" title="BADGES & TAGS" />
      <section className={styles.uiSpecSection}>
        <div className={styles.card}>
          <div className={styles.badgeGroup}>
            <div className={styles.badgeGroupLabel}>Standard Badges</div>
            <div className={styles.badgeGroupItems}>
              <Badge>Default</Badge>
              <Badge>Methodology</Badge>
              <Badge>Working Paper</Badge>
              <Badge>Peer Reviewed</Badge>
            </div>
          </div>

          <div className={styles.badgeGroup}>
            <div className={styles.badgeGroupLabel}>Highlight Badges (Gold)</div>
            <div className={styles.badgeGroupItems}>
              <Badge variant="highlight">Macroeconomics</Badge>
              <Badge variant="highlight">Monetary Policy</Badge>
              <Badge variant="highlight">Labor Markets</Badge>
            </div>
          </div>

          <div className={styles.badgeGroup}>
            <div className={styles.badgeGroupLabel}>Info Badges (Blue)</div>
            <div className={styles.badgeGroupItems}>
              <Badge variant="info">Julia</Badge>
              <Badge variant="info">Python</Badge>
              <Badge variant="info">R</Badge>
              <Badge variant="info">Stata</Badge>
            </div>
          </div>

          <div className={styles.badgeGroup}>
            <div className={styles.badgeGroupLabel}>Success Badges (Green)</div>
            <div className={styles.badgeGroupItems}>
              <Badge variant="success">Published</Badge>
              <Badge variant="success">Accepted</Badge>
              <Badge variant="success">Featured</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== WORK IN PROGRESS SIGN ===================== */}
      <section>
        <SpecCaption category="UI Specimen" title="Work in Progress Sign" />
        <section className={styles.wipPanel}>
          <div className={styles.wipBanner} role="status" aria-label="Work in progress">
            <span className={styles.wipLabel}>WORK IN PROGRESS</span>
          </div>
        </section>
      </section>
    </>
  )
}

/* --------------------------- Sub-components --------------------------- */

// Grouping wrapper so a palette row's label + 12 swatches sit as direct grid
// children (a Fragment keeps the grid flat).
function RowFragment({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// A token-grid row: mono label + light-mode demo cell + dark-mode demo cell.
function ColorTokenRow({
  name,
  light,
  lightBg,
  dark,
  darkBg,
}: {
  name: string
  light: ReactNode
  lightBg: string
  dark: ReactNode
  darkBg: string
}) {
  return (
    <>
      <div className={styles.tokenGridLabel}>
        <div className="mono" style={{ fontSize: 'var(--font-xs)' }}>{name}</div>
      </div>
      <div className={styles.tokenGridDemo} style={{ background: lightBg }}>{light}</div>
      <div className={styles.tokenGridDemo} style={{ background: darkBg }}>{dark}</div>
    </>
  )
}

// A row label that copies the literal "NA" on click (matching the static
// page, which bound the copy handler to every [data-color], NA included).
function CopyableLabel({
  className,
  color,
  children,
}: {
  className: string
  color: string
  children: ReactNode
}) {
  const { copied, copy } = useCopyFeedback()
  return (
    <div
      className={className}
      style={{ cursor: 'pointer' }}
      title="Click to copy hex code"
      onClick={() => copy(color)}
    >
      {copied ? <div style={copiedOverlayStyle}>Copied!</div> : children}
    </div>
  )
}

// A Full-Color-Palette swatch: copies its hex, optionally shows a contrast badge.
function PaletteSwatch({
  hex,
  varName,
  register,
  badge,
}: {
  hex: string
  varName: string
  register: (el: HTMLDivElement | null) => void
  badge?: { level: Level; text: string }
}) {
  const { copied, copy } = useCopyFeedback()
  const elRef = useRef<HTMLDivElement | null>(null)
  return (
    <div
      ref={(el) => {
        elRef.current = el
        register(el)
      }}
      className={styles.colorGridSwatch}
      style={{ background: `var(--${varName})`, cursor: 'pointer' }}
      title="Click to copy hex code"
      onClick={() => copy(computedHex(elRef.current) || `#${hex}`)}
    >
      {copied && <div style={copiedOverlayStyle}>Copied!</div>}
      {!copied && badge && (
        <div className={`${styles.contrastBadge} ${badgeLevelClass[badge.level]}`}>{badge.text}</div>
      )}
    </div>
  )
}

// A plot-palette swatch with its hex label and (optionally) a contrast badge.
function PlotSwatchCell({
  swatch,
  register,
  badge,
}: {
  swatch: PlotSwatch
  register: (el: HTMLDivElement | null) => void
  badge?: { level: Level; text: string }
}) {
  const { copied, copy } = useCopyFeedback()
  const elRef = useRef<HTMLDivElement | null>(null)
  const cls = [
    styles.plotGridSwatch,
    swatch.top ? styles.plotGridSwatchTop : '',
    swatch.rowTop ? styles.plotGridSwatchRowTop : '',
  ].filter(Boolean).join(' ')
  return (
    <div
      ref={(el) => {
        elRef.current = el
        register(el)
      }}
      className={cls}
      style={{ background: `var(--${swatch.varName})`, cursor: 'pointer' }}
      title="Click to copy hex code"
      onClick={() => copy(computedHex(elRef.current) || `#${swatch.hex}`)}
    >
      {copied ? (
        <div style={copiedOverlayStyle}>Copied!</div>
      ) : (
        <>
          <div
            className={`${styles.plotColorLabel} ${swatch.labelLight ? styles.plotColorLabelLight : styles.plotColorLabelDark}`}
          >
            {swatch.label}
          </div>
          {badge && <div className={`${styles.contrastBadge} ${badgeLevelClass[badge.level]}`}>{badge.text}</div>}
        </>
      )}
    </div>
  )
}
