// Framework-free derivation for the Layered Life Calendar. Ported from the design
// prototype's logic class (`Layered Life Calendar.dc.html`), which is the source of
// truth for the edge cases. The one change: the prototype worked in Excel serial
// dates; the pipeline emits ISO strings, so we convert each to an integer
// *day-index* (days since the Unix epoch, at UTC midnight) and keep all of the
// prototype's integer week/lane arithmetic unchanged.
import type { CalendarData, CalendarEvent, EventType, Scope, Term } from '@/data/calendar'

const DAY_MS = 86400000

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FMON = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ── Date helpers (all on integer day-indices) ───────────────────────────────
/** ISO `YYYY-MM-DD` → day-index (UTC midnight / 86_400_000). */
export function toDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}
export function fromDay(day: number): Date {
  return new Date(day * DAY_MS)
}
export function dow(day: number): number {
  return fromDay(day).getUTCDay()
}
/** Sunday of the week containing `day` — the boundary between past and present. */
export function weekStartOf(day: number): number {
  return day - dow(day)
}
export function dayNum(day: number): string {
  return String(fromDay(day).getUTCDate())
}
/** "Sep 21" */
export function shortDate(day: number): string {
  const d = fromDay(day)
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`
}
/** "Sep 6, 2027" */
export function shortDateY(day: number): string {
  const d = fromDay(day)
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}
/** "Sep 21 – Dec 12, 2026" */
export function spanLabel(a: number, b: number): string {
  const da = fromDay(a)
  const db = fromDay(b)
  return `${MON[da.getUTCMonth()]} ${da.getUTCDate()} – ${MON[db.getUTCMonth()]} ${db.getUTCDate()}, ${db.getUTCFullYear()}`
}
/** "Monday, September 21, 2026" */
export function dateLabel(day: number): string {
  const d = fromDay(day)
  return `${WK[d.getUTCDay()]}, ${FMON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

// ── Vocabulary helpers ──────────────────────────────────────────────────────
export const SCOPES: Scope[] = ['university', 'personal_academic', 'fellowship', 'personal']

export const SCOPE_LABEL: Record<Scope, string> = {
  university: 'University',
  personal_academic: 'Academic',
  fellowship: 'Fellowship',
  personal: 'Personal',
}

/** Which single-day event types render as a chip (holidays get the gold border). */
export const CHIP_TYPES: EventType[] = ['milestone', 'exam', 'deadline', 'event', 'course']

const PRETTY: Record<string, string> = {
  term_start: 'Quarter begins',
  term_end: 'Quarter ends',
  instruction_start: 'Instruction begins',
  instruction_end: 'Instruction ends',
  exam_period: 'Final exams',
  holiday: 'University holiday',
  milestone: 'Term milestone',
  exam: 'Exam',
  course: 'Course',
  deadline: 'Deadline',
  travel: 'Travel',
  vacation: 'Vacation',
  event: 'Event',
}
export function prettyType(t: string): string {
  return PRETTY[t] ?? t
}

export function scopeColor(s: Scope): string {
  return s === 'university'
    ? 'var(--primaryBlue)'
    : s === 'personal_academic'
      ? 'var(--Res-orange1)'
      : s === 'fellowship'
        ? 'var(--integrityIndigo)'
        : 'var(--shamrockGreen)'
}

/** Trim UCSD's trailing category word for display. Pipeline labels are already
 *  cleaned, so this is a harmless safety net for anything that slips through. */
export function holName(label: string): string {
  return label.replace(/\s+(Holiday|Observance|Observation)$/, '')
}

// ── Internal (day-index) shapes ─────────────────────────────────────────────
export interface Range {
  a: number
  b: number
}

export interface EventI {
  a: number
  b: number
  scope: Scope
  type: EventType
  label: string
  notes: string
  startTime: string | null
  endTime: string | null
  allDay: boolean
}

export interface TermI {
  a: number
  b: number
  name: string
  instr: Range | null
  exam: Range | null
}

export interface BlockSpec {
  kind: 'term' | 'break'
  a: number
  b: number
  name: string
  instr: Range | null
  exam: Range | null
  days: number
}

export type Band = 'instruction' | 'exam' | 'break' | 'pre'

export interface CalendarModel {
  events: EventI[]
  eventsOn: Map<number, EventI[]>
  barEvents: EventI[]
  terms: TermI[]
  scopeCounts: { scope: Scope; count: number }[]
  firstStart: number
  lastEnd: number
}

/** Convert the loaded JSON into the day-index model the renderer works from. */
export function buildModel(data: CalendarData): CalendarModel {
  const events: EventI[] = data.events.map((e: CalendarEvent) => ({
    a: toDay(e.start),
    b: toDay(e.end),
    scope: e.scope,
    type: e.type,
    label: e.label,
    notes: e.notes,
    startTime: e.start_time,
    endTime: e.end_time,
    allDay: e.all_day,
  }))

  const eventsOn = new Map<number, EventI[]>()
  for (const e of events) {
    for (let s = e.a; s <= e.b; s++) {
      const arr = eventsOn.get(s)
      if (arr) arr.push(e)
      else eventsOn.set(s, [e])
    }
  }

  // Finals are a tint and holidays are the gold border, so neither draws a bar.
  const barEvents = events
    .filter((e) => e.b > e.a && e.type !== 'exam_period' && e.type !== 'holiday')
    .sort((x, y) => x.a - y.a)

  const terms: TermI[] = data.terms
    .map((t: Term) => ({
      a: toDay(t.start),
      b: toDay(t.end),
      name: t.name,
      instr:
        t.instruction_start && t.instruction_end
          ? { a: toDay(t.instruction_start), b: toDay(t.instruction_end) }
          : null,
      exam:
        t.exam_start && t.exam_end
          ? { a: toDay(t.exam_start), b: toDay(t.exam_end) }
          : null,
    }))
    .sort((x, y) => x.a - y.a)

  const scopeCounts = SCOPES.map((sc) => ({
    scope: sc,
    count: events.filter((e) => e.scope === sc).length,
  }))

  const starts = events.map((e) => e.a)
  const ends = events.map((e) => e.b)

  return {
    events,
    eventsOn,
    barEvents,
    terms,
    scopeCounts,
    firstStart: Math.min(...starts),
    lastEnd: Math.max(...ends),
  }
}

export interface BlockOptions {
  showBreaks: boolean
  /** Gaps shorter than this are administrative changeovers, not breaks (matches
   *  the pipeline's MIN_REAL_BREAK_DAYS / is_major). */
  minBreakDays: number
}

/** Term blocks in date order, with a break block filling each real gap between
 *  consecutive terms. Term boundaries (not the pipeline's instruction-keyed
 *  breaks) define the blocks so every day belongs to exactly one block. */
export function buildBlocks(terms: TermI[], opts: BlockOptions): BlockSpec[] {
  const out: BlockSpec[] = []
  terms.forEach((t, i) => {
    out.push({ kind: 'term', a: t.a, b: t.b, name: t.name, instr: t.instr, exam: t.exam, days: t.b - t.a + 1 })
    const nx = terms[i + 1]
    if (nx && nx.a > t.b + 1) {
      const a = t.b + 1
      const b = nx.a - 1
      const days = b - a + 1
      if (days >= opts.minBreakDays) {
        out.push({ kind: 'break', a, b, name: 'Interquarter Break', instr: null, exam: null, days })
      }
    }
  })
  return opts.showBreaks ? out : out.filter((x) => x.kind !== 'break')
}

export function breakRangesOf(blocks: BlockSpec[]): Range[] {
  return blocks.filter((b) => b.kind === 'break').map((b) => ({ a: b.a, b: b.b }))
}

/** Structural classification of a day: drives the day tint and the detail badge. */
export function dayBand(day: number, terms: TermI[], breakRanges: Range[]): Band {
  for (const t of terms) if (t.exam && day >= t.exam.a && day <= t.exam.b) return 'exam'
  for (const t of terms) if (t.instr && day >= t.instr.a && day <= t.instr.b) return 'instruction'
  for (const r of breakRanges) if (day >= r.a && day <= r.b) return 'break'
  return 'pre'
}

/** Chip text: course/timed events lead with their start time. */
export function chipLabel(e: EventI): string {
  return e.startTime ? `${e.startTime} ${e.label}` : e.label
}

/** Detail-panel meta line: "<Type>  ·  <date or range>[ · HH:MM–HH:MM]". */
export function eventMeta(e: EventI): string {
  const dateStr = e.b > e.a ? `${shortDate(e.a)} – ${shortDate(e.b)}` : shortDate(e.a)
  const timeStr = e.startTime ? `  ·  ${e.startTime}${e.endTime ? '–' + e.endTime : ''}` : ''
  return `${prettyType(e.type)}  ·  ${dateStr}${timeStr}`
}

// ── "Now" helpers: where today sits, and what is coming up ──────────────────
/** A block's week-aligned window — the rows the grid actually draws for it. */
export function blockWindow(bl: BlockSpec): Range {
  return { a: bl.a - dow(bl.a), b: bl.b + (6 - dow(bl.b)) }
}

export interface BlockProgress {
  name: string
  /** 1-based index of the week containing `day`. */
  week: number
  weeks: number
}

/** Which block `day` falls in, and how far into it we are. Null in the short
 *  administrative gaps that no block covers, and outside the calendar entirely. */
export function blockProgress(day: number, blocks: BlockSpec[]): BlockProgress | null {
  const bl = blocks.find((x) => day >= x.a && day <= x.b)
  if (!bl) return null
  const win = blockWindow(bl)
  return {
    name: bl.name,
    week: Math.floor((weekStartOf(day) - win.a) / 7) + 1,
    weeks: (win.b - win.a + 1) / 7,
  }
}

/** Structural types are already legible from the block headers. */
export const UPNEXT_EXCLUDE: EventType[] = [
  'term_start',
  'term_end',
  'instruction_start',
  'instruction_end',
  'exam_period',
]

/** The next `n` actionable items still running on or after `today`, in date
 *  order. A repeating series (a course meeting twelve times) collapses to its
 *  next occurrence, so one commitment cannot crowd out the rest of the list. */
export function nextUp(
  events: EventI[],
  today: number,
  filters: Record<Scope, boolean>,
  n: number,
): EventI[] {
  const seen = new Set<string>()
  return events
    .filter((e) => e.b >= today && filters[e.scope] && !UPNEXT_EXCLUDE.includes(e.type))
    .sort((x, y) => x.a - y.a || x.b - y.b)
    .filter((e) => {
      const key = `${e.scope}|${e.type}|${e.label}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, n)
}

/** "in progress" / "today" / "tomorrow" / "in 12 days" */
export function relativeWhen(e: EventI, today: number): string {
  if (e.a <= today) return e.b > today ? 'in progress' : 'today'
  const d = e.a - today
  if (d === 1) return 'tomorrow'
  return `in ${d} days`
}
