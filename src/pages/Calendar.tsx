import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Badge, Panel } from '@/ui'
import type { BadgeVariant } from '@/ui'
import { DayDetailModal } from '@/components/DayDetailModal/DayDetailModal'
import { calendarData } from '@/data/calendar'
import type { Scope } from '@/data/calendar'
import {
  blockProgress,
  blockWindow,
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
  nextUp,
  relativeWhen,
  scopeColor,
  SCOPE_LABEL,
  SCOPES,
  shortDate,
  shortDateY,
  spanLabel,
  toDay,
  weekStartOf,
} from './calendarModel'
import type { BlockSpec, EventI } from './calendarModel'
import styles from './Calendar.module.css'

// Gaps shorter than this are administrative changeovers, not breaks — mirrors
// MIN_REAL_BREAK_DAYS / is_major in the Python pipeline.
const MIN_BREAK_DAYS = 3

// How many items the "Up next" strip shows.
const UPNEXT_COUNT = 4

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
  isToday: boolean
  dayLabel: string
  style: CSSProperties
  dnColor: string
  holColor: string
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
  isCurrentWeek: boolean
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
  // Muted on purpose: fellowship sessions are real, but they should not read as
  // heavily as coursework and exams.
  fellowship: 'unsure',
  personal: 'success',
}
const SCOPE_ORDER: Record<Scope, number> = {
  university: 0,
  personal_academic: 1,
  fellowship: 2,
  personal: 3,
}

// Matches the mobile breakpoint used in Calendar.module.css and Layout.module.css.
const NARROW_QUERY = '(max-width: 768px)'

// True while the viewport is at phone width. Guarded for the SSR smoke test,
// which renders every route without a window.
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(NARROW_QUERY).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(NARROW_QUERY)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return narrow
}

export default function Calendar() {
  const [filters, setFilters] = useState<Record<Scope, boolean>>({
    university: true,
    personal_academic: true,
    fellowship: true,
    personal: true,
  })

  const model = useMemo(() => buildModel(calendarData), [])
  const today = useMemo(() => toDay(new Date().toISOString().slice(0, 10)), [])
  // The Sunday of the current week is the cut line between past and present.
  const weekStart = weekStartOf(today)

  const specs = useMemo(
    () => buildBlocks(model.terms, { showBreaks: true, minBreakDays: MIN_BREAK_DAYS }),
    [model],
  )
  const aheadSpecs = useMemo(() => specs.filter((s) => s.b >= weekStart), [specs, weekStart])
  const pastSpecs = useMemo(() => specs.filter((s) => s.b < weekStart), [specs, weekStart])
  // A quarter ending mid-week and the break starting the next day both draw
  // that shared week, so the "this week" seam is pinned to the first of them.
  const markerSpec = useMemo(
    () =>
      aheadSpecs.find((s) => {
        const w = blockWindow(s)
        return weekStart >= w.a && weekStart <= w.b
      }) ?? null,
    [aheadSpecs, weekStart],
  )

  // The detail panel opens on today rather than on an empty prompt.
  const [selected, setSelected] = useState<number | null>(today)

  // On phones the sticky detail panel would swallow the viewport, so the same
  // content is shown in a modal instead. It starts closed so the `today`
  // preselect above does not pop a modal on first paint.
  const isNarrow = useIsNarrow()
  const [modalOpen, setModalOpen] = useState(false)
  const closeModal = useCallback(() => setModalOpen(false), [])

  // Selecting a day always updates the panel; on mobile it also opens the modal.
  const openDay = useCallback(
    (day: number) => {
      setSelected(day)
      if (isNarrow) setModalOpen(true)
    },
    [isNarrow],
  )

  // Resizing up to desktop hands the content back to the sticky panel.
  useEffect(() => {
    if (!isNarrow) setModalOpen(false)
  }, [isNarrow])

  // Once the calendar data runs out there is nothing but history left to show,
  // so the archive starts open in that case.
  const [showPast, setShowPast] = useState(aheadSpecs.length === 0)

  // Comfortable density: extra cell height reserved below the day number.
  const cellExtra = 38

  // ── Build the block/week/cell/span geometry from current state ────────────
  // One builder serves both lists, so the archive and the live grid can never
  // drift apart. Past blocks are only built while the disclosure is open.
  const { ahead, past } = useMemo<{ ahead: BlockVM[]; past: BlockVM[] }>(() => {
    const buildBlockVM = (bl: BlockSpec): BlockVM => {
      const isBreak = bl.kind === 'break'
      const weeks: WeekVM[] = []
      const win = blockWindow(bl)
      // A block straddling the current week starts at it instead of at its own
      // first week; the per-cell inRange test already greys any leading days
      // that fall before the block itself.
      const clipped = weekStart > win.a && weekStart <= win.b
      const ws = clipped ? weekStart : win.a

      // The university holiday (if any) shown on a given in-range day. Used both
      // for the gold treatment and to detect adjacent holiday days so the outline
      // wraps the whole run instead of boxing each cell (no interior gold line).
      const holOf = (day: number) =>
        day >= bl.a && day <= bl.b && filters.university
          ? (model.eventsOn.get(day) ?? []).find((e) => e.type === 'holiday')
          : undefined

      for (let s = ws; s <= win.b; s += 7) {
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
          // Only a fully elapsed segment fades; a bar still running keeps its
          // fill, so nothing has to be split at the today boundary.
          const gone = g.segE < today
          return {
            key: `${g.e.a}-${g.e.type}-${i}`,
            label: g.e.label,
            style: {
              left: `${(startCol / 7) * 100}%`,
              width: `${(w / 7) * 100}%`,
              top: `${lane * 20}px`,
              background: gone ? 'transparent' : `color-mix(in srgb, ${scol} 24%, var(--bg))`,
              borderLeft: `3px solid ${gone ? `color-mix(in srgb, ${scol} 55%, var(--bg))` : scol}`,
              color: gone ? 'var(--cal-ink-past)' : undefined,
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
          // Strictly before today — today itself is never "past".
          const gone = inRange && day < today
          const isToday = inRange && day === today

          let bg: string
          let dnColor: string
          if (!inRange) {
            bg = 'color-mix(in srgb, var(--ink) 3%, var(--bg))'
            dnColor = 'color-mix(in srgb, var(--ink) 28%, var(--bg))'
          } else {
            let base = gone ? 'var(--cal-surface-past)' : 'var(--bg)'
            const bd = isBreak ? 'break' : dayBand(day, model.terms, [])
            if (bd === 'instruction')
              base = gone ? 'var(--cal-tint-instruction-past)' : 'var(--cal-tint-instruction)'
            else if (bd === 'exam')
              base = gone ? 'var(--cal-tint-finals-past)' : 'var(--cal-tint-finals)'
            else if (bd === 'break') base = 'var(--bg-muted)'
            bg = weekend ? `color-mix(in srgb, var(--ink) 8%, ${base})` : base
            if (gone) dnColor = weekend ? 'var(--cal-ink-past-faint)' : 'var(--cal-ink-past)'
            else dnColor = weekend ? 'var(--text-secondary)' : 'var(--text-primary)'
          }

          const dayEvents = model.eventsOn.get(day) ?? []
          const holEv = holOf(day)
          // Adjacent holiday days in the same week row (edges omitted so the gold
          // outlines the whole run rather than each box).
          const leftIsHol = k > 0 && !!holOf(day - 1)
          const rightIsHol = k < 6 && !!holOf(day + 1)
          const selHi = inRange && selected === day

          const shadows: string[] = []
          // Today's rail is listed first so it paints over the holiday outline
          // and the selection ring rather than under them.
          if (isToday) shadows.push('inset 4px 0 0 0 var(--active-indicator)')
          if (holEv) {
            const g = gone ? 'var(--cal-gold-past)' : 'var(--gold)'
            shadows.push(`inset 0 2px 0 0 ${g}`, `inset 0 -2px 0 0 ${g}`) // top + bottom
            if (!leftIsHol) shadows.push(`inset 2px 0 0 0 ${g}`) // left cap of the run
            if (!rightIsHol) shadows.push(`inset -2px 0 0 0 ${g}`) // right cap of the run
          }
          if (selHi) shadows.push('inset 0 0 0 2px var(--ink)')
          if (holEv) dnColor = gone ? 'var(--cal-ink-past)' : 'var(--cal-holiday-text)'
          if (isToday) dnColor = 'var(--active-indicator)'

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
                    // Elapsed chips drop their fill but keep the scope border,
                    // so the layer stays identifiable without competing.
                    style: gone
                      ? {
                          background: 'transparent',
                          borderLeft: `3px solid color-mix(in srgb, ${scol} 55%, var(--bg))`,
                          color: 'var(--cal-ink-past)',
                        }
                      : {
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
            isToday,
            dayLabel: shortDate(day),
            style,
            dnColor,
            holColor: gone ? 'var(--cal-ink-past)' : 'var(--cal-holiday-text)',
            chips,
            title,
            hasHoliday: isSingleHol,
            holidayLabel: isSingleHol && holEv ? holName(holEv.label) : '',
          })
        }

        weeks.push({
          key: s,
          isCurrentWeek: s === weekStart && bl === markerSpec,
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
      const metaParts: string[] = []
      if (!isBreak && ip && ep) {
        metaParts.push(
          `Instruction ${shortDate(ip.a)}–${shortDate(ip.b)}   ·   Finals ${shortDate(ep.a)}–${shortDate(ep.b)}`,
        )
      } else if (isBreak) {
        metaParts.push(`${bl.days}-day break`)
      }
      if (clipped) {
        metaParts.push(
          `In progress — week ${Math.floor((weekStart - win.a) / 7) + 1} of ${(win.b - win.a + 1) / 7}`,
        )
      }

      return {
        key: `${bl.kind}-${bl.a}`,
        isBreak,
        name: bl.name,
        range: spanLabel(bl.a, bl.b),
        meta: metaParts.join('   ·   '),
        weeks,
      }
    }

    return {
      ahead: aheadSpecs.map(buildBlockVM),
      past: showPast ? pastSpecs.map(buildBlockVM) : [],
    }
  }, [model, filters, selected, today, weekStart, aheadSpecs, pastSpecs, showPast, markerSpec])

  const breakRanges = useMemo(() => breakRangesOf(specs), [specs])

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

  // Rendered by the sticky panel on desktop and by the modal on mobile, so the
  // two presentations can never drift apart.
  const detailTitle = detail ? detail.label : 'Details'
  const detailBody = (
    <>
      {!detail && (
        <div className={styles.detailEmpty}>
          Click any day to see its full detail — university structure, academic obligations, and
          personal life, including notes.
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
    </>
  )

  const toggleFilter = (scope: Scope) =>
    setFilters((f) => ({ ...f, [scope]: !f[scope] }))

  // ── "Now" summaries ───────────────────────────────────────────────────────
  const upcoming = useMemo(
    () => nextUp(model.events, today, filters, UPNEXT_COUNT),
    [model, today, filters],
  )
  // Counted under the active layers so the bar agrees with what expanding shows.
  const pastCount = useMemo(
    () => model.events.filter((e) => e.b < today && filters[e.scope]).length,
    [model, today, filters],
  )
  const pastTerms = pastSpecs.filter((s) => s.kind === 'term').length
  const progress = useMemo(() => blockProgress(today, specs), [today, specs])
  const lastDay = specs.length ? specs[specs.length - 1].b : model.lastEnd

  // ── Static-ish control data ───────────────────────────────────────────────
  const legend: { key: string; style: CSSProperties; label: string }[] = [
    { key: 'instr', label: 'Instruction', style: tintSwatch('var(--cal-tint-instruction)') },
    { key: 'fin', label: 'Finals', style: tintSwatch('var(--cal-tint-finals)') },
    { key: 'brk', label: 'Break', style: tintSwatch('var(--bg-muted)') },
    { key: 'wknd', label: 'Weekend', style: tintSwatch('color-mix(in srgb, var(--ink) 8%, var(--bg))') },
    { key: 'past', label: 'Elapsed', style: tintSwatch('var(--cal-tint-instruction-past)') },
  ]

  const pastToggle = (atBottom: boolean) => (
    <button
      type="button"
      className={styles.pastBar}
      aria-expanded={showPast}
      onClick={() => setShowPast((v) => !v)}
    >
      <span aria-hidden="true">{showPast ? '▾' : '▸'}</span>
      <span className={styles.pastBarLabel}>Past</span>
      {/* The archive spans years, and spanLabel only carries the end year. */}
      <span>{`${shortDateY(pastSpecs[0].a)} – ${shortDateY(weekStart - 1)}`}</span>
      <span className={styles.pastBarMeta}>
        {pastCount} {pastCount === 1 ? 'item' : 'items'}
        {'  ·  '}
        {pastTerms} {pastTerms === 1 ? 'quarter' : 'quarters'}
        {'  ·  '}
        {showPast ? (atBottom ? 'collapse ▴' : 'collapse') : 'expand'}
      </span>
    </button>
  )

  const renderBlock = (b: BlockVM) => (
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
          <Fragment key={w.key}>
            {w.isCurrentWeek && <div className={styles.weekMarker}>This week</div>}
            <div className={styles.week}>
              <div className={styles.weekGrid}>
                {w.cells.map((c) => (
                  <div
                    key={c.key}
                    className={styles.cell}
                    style={c.style}
                    title={c.title}
                    aria-current={c.isToday ? 'date' : undefined}
                    onClick={c.inRange ? () => openDay(c.day) : undefined}
                  >
                    <span
                      className={c.isToday ? `${styles.dayNum} ${styles.dayNumToday}` : styles.dayNum}
                      style={{ color: c.dnColor }}
                    >
                      {c.dayLabel}
                    </span>
                    {c.hasHoliday ? (
                      <span className={styles.holLabel} style={{ color: c.holColor }}>
                        {c.holidayLabel}
                      </span>
                    ) : c.isToday ? (
                      <span className={styles.todayTag}>Today</span>
                    ) : null}
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
          </Fragment>
        ))}
      </div>
    </div>
  )

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <span className={styles.todayLine}>
          Today is {dateLabel(today)}
          {progress ? `  ·  ${progress.name}, week ${progress.week} of ${progress.weeks}` : ''}
          {`  ·  calendar runs through ${shortDateY(lastDay)}`}
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

      {upcoming.length > 0 && (
        <div className={styles.upNext}>
          <span className={styles.upNextLabel}>Up next</span>
          {upcoming.map((e, i) => (
            <button
              key={`${e.a}-${e.type}-${i}`}
              type="button"
              className={styles.upNextRow}
              onClick={() => openDay(e.a)}
            >
              <span className={styles.upNextDot} style={{ background: scopeColor(e.scope) }} />
              <span className={styles.upNextItem}>
                {e.type === 'holiday' ? holName(e.label) : e.label}
              </span>
              <span className={styles.upNextWhen}>
                {e.b > e.a ? `${shortDate(e.a)} – ${shortDate(e.b)}` : shortDate(e.a)}
                {'  ·  '}
                {relativeWhen(e, today)}
              </span>
            </button>
          ))}
        </div>
      )}

      {!isNarrow && (
        <div className={styles.detailWrap}>
          <Panel title={detailTitle}>{detailBody}</Panel>
        </div>
      )}

      <DayDetailModal open={isNarrow && modalOpen} title={detailTitle} onClose={closeModal}>
        {detailBody}
      </DayDetailModal>

      {pastSpecs.length > 0 && pastToggle(false)}
      {past.length > 0 && (
        <>
          <div className={styles.pastSection}>{past.map(renderBlock)}</div>
          {pastToggle(true)}
        </>
      )}

      {ahead.length === 0 ? (
        <div className={styles.pastNote}>
          The calendar runs through {shortDateY(lastDay)}; nothing is scheduled beyond it.
        </div>
      ) : (
        <div className={styles.blocks}>{ahead.map(renderBlock)}</div>
      )}

      <div className={styles.footnote}>
        The grid opens on the week containing today; earlier quarters stay available under
        <em> Past</em>. Days that have already elapsed are drawn in a faded treatment wherever
        they appear. Each quarter block runs from its start to its final-exam day; interquarter
        breaks fill the gap until the next quarter opens. Weekends and break blocks are inferred
        from the calendar, not stored in the source data. Structure comes from UC San Diego's
        published academic calendar; academic and personal items are my own.
      </div>
    </section>
  )
}

// ── Inline-style builder for the legend tint swatches ────────────────────────
function tintSwatch(bg: string): CSSProperties {
  return { width: '16px', height: '12px', background: bg, border: '1px solid var(--ink-muted)', display: 'block' }
}
