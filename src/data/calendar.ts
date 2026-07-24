// Typed loader + format contract for the Layered Life Calendar.
//
// These interfaces mirror `to_payload()` in the Python pipeline's
// `c_build_calendar.py` field-for-field. The JSON is produced there and copied
// in by `d_export_calendar.py`; if the Python payload changes shape, this file is
// the single place the site needs to be updated to match.
//
// Dates are ISO `YYYY-MM-DD` strings (term date fields may be null when a term
// lacks that marker). `calendarModel.ts` converts them to integer day-indices for
// the week/lane arithmetic.
import rawData from './calendar.json'

export type Scope = 'university' | 'personal_academic' | 'personal'

export type EventType =
  | 'term_start'
  | 'term_end'
  | 'instruction_start'
  | 'instruction_end'
  | 'exam_period'
  | 'holiday'
  | 'milestone'
  | 'exam'
  | 'course'
  | 'deadline'
  | 'travel'
  | 'vacation'
  | 'event'

export interface CalendarEvent {
  /** ISO `YYYY-MM-DD`. */
  start: string
  /** ISO `YYYY-MM-DD`; always filled (equals `start` for single-day events). */
  end: string
  /** Inclusive day count (`end - start + 1`). */
  days: number
  /** 24-hour `HH:MM`, or null for an all-day event. */
  start_time: string | null
  end_time: string | null
  all_day: boolean
  scope: Scope
  type: EventType
  label: string
  academic_year: string
  notes: string
}

export interface Term {
  name: string
  academic_year: string
  /** ISO dates; the derived fields may be null if a term lacks that marker. */
  start: string
  end: string
  instruction_start: string | null
  instruction_end: string | null
  exam_start: string | null
  exam_end: string | null
  /** Last day the term is finished with you (last exam, else last instruction). */
  closes: string | null
}

export interface Break {
  label: string
  start: string
  end: string
  days: number
  after_term: string
  before_term: string
  academic_year: string
  crosses_years: boolean
  /** false for administrative changeovers shorter than MIN_REAL_BREAK_DAYS. */
  is_major: boolean
}

export interface Vocabulary {
  scopes: Scope[]
  types: Record<string, string>
}

export interface CalendarData {
  generated_at: string
  source: string
  academic_years: string[]
  range: { start: string; end: string }
  break_rule: string
  vocabulary: Vocabulary
  terms: Term[]
  breaks: Break[]
  events: CalendarEvent[]
}

// `resolveJsonModule` infers an over-narrow literal type from the file contents
// (e.g. `start_time: null`), so widen through `unknown` to the real contract.
export const calendarData = rawData as unknown as CalendarData

export default calendarData
