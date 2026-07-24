import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Badge, Panel } from '@/ui'
import type { BadgeVariant } from '@/ui'
import { calendarData } from '@/data/calendar'
import type { Scope } from '@/data/calendar'
import {
  buildBlocks,
  buildModel,
  breakRangesOf,
  chipLabel,
  CHIP_TYPES,
  dateLabel,
  dayBand,
  dow,
  eventMeta,
  holName,
  scopeColor,
  SCOPE_LABEL,
  SCOPES,
  shortDate,
  spanLabel,
  toDay,
} from './calendarModel'
import type { EventI } from './calendarModel'
import styles from './Calendar.module.css'

// Gaps shorter than this are administrative changeovers, not breaks — mirrors
// MIN_REAL_BREAK_DAYS / is_major in the Python pipeline.
const MIN_BREAK_DAYS = 3

// ── View-model shapes (built per render from the current filters/options) ────
interface ChipVM {
  key: string
  label: string
  style: CSSProperties
}
interface CellVM {
  key: number
  day: number
  inRange: boolean
  dayLabel: string
  style: CSSProperties
  dnColor: string
  chips: ChipVM[]
  title: string
  hasHoliday: boolean
  holidayLabel: string
}
interface SpanVM {
  key: string
  label: string
  style: CSSProperties
}
interface WeekVM {
  key: number
  cells: CellVM[]
  spans: SpanVM[]
  overlayStyle: CSSProperties
}
interface BlockVM {
  key: string
  isBreak: boolean
  name: string
  range: string
  meta: string
  weeks: WeekVM[]
}
interface Seg {
  e: EventI
  segS: number
  segE: number
}

const SCOPE_BADGE: Record<Scope, BadgeVariant> = {
  university: 'info',
  personal_academic: 'warning',
  personal: 'success',
}
const SCOPE_ORDER: Record<Scope, number> = { university: 0, personal_academic: 1, personal: 2 }

export default function Calendar() {
  const [filters, setFilters] = useState<Record<Scope, boolean>>({
    university: true,
    personal_academic: true,
    personal: true,
  })
  const [selected, setSelected] = useState<number | null>(null)

  const model = useMemo(() => buildModel(calendarData), [])
  const today = useMemo(() => toDay(new Date().toISOString().slice(0, 10)), [])

  // Comfortable density: extra cell height reserved below the day number.
  const cellExtra = 38

  // ── Build the block/week/cell/span geometry from current state ────────────
  const blocks = useMemo<BlockVM[]>(() => {
    const specs = buildBlocks(model.terms, { showBreaks: true, minBreakDays: MIN_BREAK_DAYS })

    return specs.map((bl) => {
      const isBreak = bl.kind === 'break'
      const weeks: WeekVM[] = []
      const ws = bl.a - dow(bl.a)
      const we = bl.b + (6 - dow(bl.b))

      // The university holiday (if any) shown on a given in-range day. Used both
      // for the gold treatment and to detect adjacent holiday days so the outline
      // wraps the whole run instead of boxing each cell (no interior gold line).
      const holOf = (day: number) =>
        day >= bl.a && day <= bl.b && filters.university
          ? (model.eventsOn.get(day) ?? []).find((e) => e.type === 'holiday')
          : undefined

      for (let s = ws; s <= we; s += 7) {
        // Multi-day spans clipped to this week ∩ block, greedily laned.
        const segs: Seg[] = model.barEvents
          .filter((e) => filters[e.scope])
          .map((e): Seg | null => {
            const segS = Math.max(e.a, s, bl.a)
            const segE = Math.min(e.b, s + 6, bl.b)
            return segE < segS ? null : { e, segS, segE }
          })
          .filter((g): g is Seg => g !== null)
          .sort((x, y) => x.segS - y.segS)

        const laneEnds: number[] = []
        const spans: SpanVM[] = segs.map((g, i) => {
          let lane = laneEnds.findIndex((end) => end < g.segS)
          if (lane < 0) lane = laneEnds.length
          laneEnds[lane] = g.segE
          const startCol = g.segS - s
          const w = g.segE - g.segS + 1
          const scol = scopeColor(g.e.scope)
          return {
            key: `${g.e.a}-${g.e.type}-${i}`,
            label: g.e.label,
            style: {
              left: `${(startCol / 7) * 100}%`,
              width: `${(w / 7) * 100}%`,
              top: `${lane * 20}px`,
              background: `color-mix(in srgb, ${scol} 24%, var(--bg))`,
              borderLeft: `3px solid ${scol}`,
            },
          }
        })

        const lanes = laneEnds.length
        const padTop = 19 + lanes * 20
        const cellH = padTop + cellExtra

        const cells: CellVM[] = []
        for (let k = 0; k < 7; k++) {
          const day = s + k
          const inRange = day >= bl.a && day <= bl.b
          const dw = dow(day)
          const weekend = dw === 0 || dw === 6

          let bg: string
          let dnColor: string
          if (!inRange) {
            bg = 'color-mix(in srgb, var(--ink) 3%, var(--bg))'
            dnColor = 'color-mix(in srgb, var(--ink) 28%, var(--bg))'
          } else {
            let base = 'var(--bg)'
            const bd = isBreak ? 'break' : dayBand(day, model.terms, [])
            if (bd === 'instruction') base = 'var(--cal-tint-instruction)'
            else if (bd === 'exam') base = 'var(--cal-tint-finals)'
            else if (bd === 'break') base = 'var(--bg-muted)'
            bg = weekend ? `color-mix(in srgb, var(--ink) 8%, ${base})` : base
            dnColor = weekend ? 'var(--text-secondary)' : 'var(--text-primary)'
          }

          const dayEvents = model.eventsOn.get(day) ?? []
          const holEv = holOf(day)
          // Adjacent holiday days in the same week row (edges omitted so the gold
          // outlines the whole run rather than each box).
          const leftIsHol = k > 0 && !!holOf(day - 1)
          const rightIsHol = k < 6 && !!holOf(day + 1)
          const selHi = inRange && selected === day

          const shadows: string[] = []
          if (holEv) {
            const g = 'var(--gold)'
            shadows.push(`inset 0 2px 0 0 ${g}`, `inset 0 -2px 0 0 ${g}`) // top + bottom
            if (!leftIsHol) shadows.push(`inset 2px 0 0 0 ${g}`) // left cap of the run
            if (!rightIsHol) shadows.push(`inset -2px 0 0 0 ${g}`) // right cap of the run
          }
          if (selHi) shadows.push('inset 0 0 0 2px var(--ink)')
          if (holEv) dnColor = 'var(--cal-holiday-text)'

          const style: CSSProperties = {
            minHeight: `${cellH}px`,
            background: bg,
            padding: `${padTop}px 0 5px`,
            cursor: inRange ? 'pointer' : 'default',
          }
          if (shadows.length) style.boxShadow = shadows.join(',')
          // Drop the faint grid divider between two adjacent holiday cells so the
          // run reads as a single boxed region.
          if (holEv && rightIsHol) style.borderRight = 'none'

          const chips: ChipVM[] = inRange
            ? dayEvents
                .filter((e) => filters[e.scope] && e.b === e.a && CHIP_TYPES.includes(e.type))
                .map((e, ci) => {
                  const scol = scopeColor(e.scope)
                  return {
                    key: `${e.type}-${e.label}-${ci}`,
                    label: chipLabel(e),
                    style: {
                      background: `color-mix(in srgb, ${scol} 14%, var(--bg))`,
                      borderLeft: `3px solid ${scol}`,
                    },
                  }
                })
            : []

          const isSingleHol = !!(holEv && holEv.a === day)
          const labels = dayEvents.filter((e) => filters[e.scope]).map((e) => e.label)
          const title = inRange
            ? dateLabel(day) + (labels.length ? '  —  ' + labels.join('; ') : '')
            : ''

          cells.push({
            key: day,
            day,
            inRange,
            dayLabel: shortDate(day),
            style,
            dnColor,
            chips,
            title,
            hasHoliday: isSingleHol,
            holidayLabel: isSingleHol && holEv ? holName(holEv.label) : '',
          })
        }

        weeks.push({
          key: s,
          cells,
          spans,
          overlayStyle: {
            position: 'absolute',
            top: '19px',
            left: 0,
            right: 0,
            height: `${lanes * 20}px`,
            pointerEvents: 'none',
          },
        })
      }

      const ip = bl.instr
      const ep = bl.exam
      const meta =
        !isBreak && ip && ep
          ? `Instruction ${shortDate(ip.a)}–${shortDate(ip.b)}   ·   Finals ${shortDate(ep.a)}–${shortDate(ep.b)}`
          : isBreak
            ? `${bl.days}-day break`
            : ''

      return {
        key: `${bl.kind}-${bl.a}`,
        isBreak,
        name: bl.name,
        range: spanLabel(bl.a, bl.b),
        meta,
        weeks,
      }
    })
  }, [model, filters, selected])

  const breakRanges = useMemo(
    () => breakRangesOf(buildBlocks(model.terms, { showBreaks: true, minBreakDays: MIN_BREAK_DAYS })),
    [model],
  )

  // ── Detail panel for the selected day ─────────────────────────────────────
  const detail = useMemo(() => {
    if (selected == null) return null
    const inBreak = breakRanges.some((r) => selected >= r.a && selected <= r.b)
    const bd = inBreak ? 'break' : dayBand(selected, model.terms, [])
    let band: { label: string; variant: BadgeVariant } | null = null
    if (bd === 'instruction') band = { label: 'University instruction in session', variant: 'info' }
    else if (bd === 'exam') band = { label: 'University final-exam period', variant: 'warning' }
    else if (bd === 'break') band = { label: 'Interquarter break', variant: 'unsure' }

    const events = (model.eventsOn.get(selected) ?? [])
      .filter((e) => filters[e.scope] && e.type !== 'exam_period')
      .sort((a, b) => SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope])

    return { label: dateLabel(selected), band, events }
  }, [selected, model, filters, breakRanges])

  const toggleFilter = (scope: Scope) =>
    setFilters((f) => ({ ...f, [scope]: !f[scope] }))

  // ── Static-ish control data ───────────────────────────────────────────────
  const legend: { key: string; style: CSSProperties; label: string }[] = [
    { key: 'instr', label: 'Instruction', style: tintSwatch('var(--cal-tint-instruction)') },
    { key: 'fin', label: 'Finals', style: tintSwatch('var(--cal-tint-finals)') },
    { key: 'brk', label: 'Break', style: tintSwatch('var(--bg-muted)') },
    { key: 'wknd', label: 'Weekend', style: tintSwatch('color-mix(in srgb, var(--ink) 8%, var(--bg))') },
  ]

  const daysOut = model.firstStart - today

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Academic Calendar · UC San Diego Economics PhD</span>
        <h2 className={styles.title}>Layered Life Calendar</h2>
        <p className={styles.intro}>
          A year-at-a-glance view that overlays three layers onto one continuous, week-per-row
          grid: the <strong>university</strong> structure (quarters, instruction, finals, and
          holidays), my <strong>academic</strong> obligations (course deadlines, exams, referee
          reports, and conference travel), and <strong>personal</strong> life (trips, vacations,
          and a cross-country move). University structure tints the days underneath; academic and
          personal items sit on top as chips and multi-day bars.
        </p>
        <span className={styles.todayLine}>
          Today is {dateLabel(today)}
          {daysOut > 0
            ? `  ·  the calendar opens ${shortDate(model.firstStart)}, ${daysOut} days out`
            : ''}
          {'  ·  '}
          spans {spanLabel(model.firstStart, model.lastEnd)}
        </span>
      </div>

      <div className={styles.controls}>
        <div className={styles.layers}>
          <span className={styles.layersLabel}>Layers</span>
          {SCOPES.map((scope) => {
            const active = filters[scope]
            const col = scopeColor(scope)
            const style: CSSProperties = active
              ? { background: col, color: '#fff', borderColor: col }
              : {}
            return (
              <button
                key={scope}
                type="button"
                className={styles.filterChip}
                style={style}
                aria-pressed={active}
                onClick={() => toggleFilter(scope)}
              >
                {SCOPE_LABEL[scope]}
              </button>
            )
          })}
        </div>
        <div className={styles.legend}>
          {legend.map((lg) => (
            <div key={lg.key} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={lg.style} />
              <span className={styles.legendLabel}>{lg.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.detailWrap}>
        <Panel title={detail ? detail.label : 'Details'}>
          {!detail && (
            <div className={styles.detailEmpty}>
              Click any day to see its full detail — university structure, academic obligations,
              and personal life, including notes.
            </div>
          )}
          {detail && detail.band && (
            <div className={styles.detailBadgeWrap}>
              <Badge variant={detail.band.variant}>{detail.band.label}</Badge>
            </div>
          )}
          {detail && detail.events.length > 0 && (
            <div>
              {detail.events.map((e, i) => (
                <div key={`${e.type}-${e.label}-${i}`} className={styles.detailRow}>
                  <div className={styles.detailDot} style={{ background: scopeColor(e.scope) }} />
                  <div className={styles.detailBody}>
                    <div className={styles.detailItemLabel}>
                      {e.type === 'holiday' ? holName(e.label) : e.label}
                    </div>
                    <div className={styles.detailMeta}>{eventMeta(e)}</div>
                    {e.notes && <div className={styles.detailNotes}>{e.notes}</div>}
                  </div>
                  <Badge variant={SCOPE_BADGE[e.scope]}>{SCOPE_LABEL[e.scope]}</Badge>
                </div>
              ))}
            </div>
          )}
          {detail && detail.events.length === 0 && !detail.band && (
            <div className={styles.detailEmpty}>No scheduled items on this day.</div>
          )}
        </Panel>
      </div>

      <div className={styles.blocks}>
        {blocks.map((b) => (
          <div key={b.key}>
            <div className={b.isBreak ? styles.blockHeaderBreak : styles.blockHeaderTerm}>
              <div className={styles.blockTitleRow}>
                <span className={b.isBreak ? styles.blockNameBreak : styles.blockNameTerm}>
                  {b.name}
                </span>
                <span className={styles.blockRange}>{b.range}</span>
              </div>
              {b.meta && <div className={styles.blockMeta}>{b.meta}</div>}
            </div>

            <div className={styles.weekdayRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d} className={styles.weekday}>
                  {d}
                </span>
              ))}
            </div>

            <div className={styles.weeksBox}>
              {b.weeks.map((w) => (
                <div key={w.key} className={styles.week}>
                  <div className={styles.weekGrid}>
                    {w.cells.map((c) => (
                      <div
                        key={c.key}
                        className={styles.cell}
                        style={c.style}
                        title={c.title}
                        onClick={c.inRange ? () => setSelected(c.day) : undefined}
                      >
                        <span className={styles.dayNum} style={{ color: c.dnColor }}>
                          {c.dayLabel}
                        </span>
                        {c.hasHoliday && <span className={styles.holLabel}>{c.holidayLabel}</span>}
                        <div className={styles.chips}>
                          {c.chips.map((ch) => (
                            <span key={ch.key} className={styles.chip} style={ch.style}>
                              {ch.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.overlay} style={w.overlayStyle}>
                    {w.spans.map((sp) => (
                      <div key={sp.key} className={styles.spanBar} style={sp.style}>
                        {sp.label}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footnote}>
        Each quarter block runs from its start to its final-exam day; interquarter breaks fill the
        gap until the next quarter opens. Weekends and break blocks are inferred from the calendar,
        not stored in the source data. Structure comes from UC San Diego's published academic
        calendar; academic and personal items are my own.
      </div>
    </section>
  )
}

// ── Inline-style builder for the legend tint swatches ────────────────────────
function tintSwatch(bg: string): CSSProperties {
  return { width: '16px', height: '12px', background: bg, border: '1px solid var(--ink-muted)', display: 'block' }
}
