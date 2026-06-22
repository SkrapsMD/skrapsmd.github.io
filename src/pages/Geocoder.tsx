import { useCallback, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import * as XLSX from 'xlsx'
import type { BookType } from 'xlsx'
import { Button, Field, Panel, Table } from '@/ui'
import styles from './Geocoder.module.css'

// ── Constants (mirrors the static inline-script app) ────────────────────────
const CENSUS_STRUCTURED = 'https://geocoding.geo.census.gov/geocoder/locations/address'
const CENSUS_ONELINE = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress'
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'
const BENCHMARK = 'Public_AR_Current'
const PREVIEW_ROWS = 5
const NOMINATIM_MIN_GAP_MS = 1100 // OSM usage policy: max 1 req/sec; pad to 1.1s.

type Field4 = 'address' | 'city' | 'state' | 'zip'

interface AliasConfig {
  exact: string[]
  contains: string[]
  containsReject?: string[]
}

const ALIASES: Record<Field4, AliasConfig> = {
  address: {
    exact: [
      'address',
      'addr',
      'street',
      'streetaddress',
      'addressline1',
      'address1',
      'addr1',
      'line1',
      'addressline',
      'streetaddr',
    ],
    contains: ['street', 'address'],
  },
  city: {
    exact: ['city', 'town', 'municipality', 'locality'],
    contains: ['city', 'town'],
  },
  state: {
    exact: [
      'state',
      'st',
      'stateabbreviation',
      'statecode',
      'stateabbr',
      'province',
      'usstate',
    ],
    contains: ['state'],
    containsReject: ['estate', 'interstate', 'realestate', 'statement', 'stateside'],
  },
  zip: {
    exact: ['zip', 'zipcode', 'zip5', 'postalcode', 'postcode', 'postal', 'zipcodes'],
    contains: ['zip', 'postal'],
  },
}

type Mapping = Record<Field4, string | null>

// A spreadsheet row is a bag of cell values keyed by header. sheet_to_json
// emits strings/numbers/booleans/Dates; we treat everything as a cell value.
type CellValue = string | number | boolean | Date | null
type Row = Record<string, CellValue>

interface Coords {
  lat: number
  lon: number
}

// ── Census / Nominatim JSON response shapes (narrowed from `unknown`) ────────
interface CensusMatch {
  coordinates: { x: number; y: number }
}
interface CensusResponse {
  result?: { addressMatches?: CensusMatch[] }
}
interface NominatimHit {
  lat: string
  lon: string
}

// ── Pure helpers ────────────────────────────────────────────────────────────
function normalize(s: unknown): string {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function detectMapping(headers: string[]): Mapping {
  const normHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }))
  const used = new Set<string>()
  const result: Mapping = { address: null, city: null, state: null, zip: null }

  // Pass 1: exact alias matches (address → zip → state → city, so the rarer/
  // more specific aliases get their pick first).
  const order: Field4[] = ['address', 'zip', 'state', 'city']
  order.forEach((field) => {
    const cfg = ALIASES[field]
    for (const h of normHeaders) {
      if (used.has(h.raw)) continue
      if (cfg.exact.includes(h.norm)) {
        result[field] = h.raw
        used.add(h.raw)
        break
      }
    }
  })

  // Pass 2: substring fallback for any still-missing field.
  order.forEach((field) => {
    if (result[field]) return
    const cfg = ALIASES[field]
    for (const h of normHeaders) {
      if (used.has(h.raw)) continue
      const matches = cfg.contains.some((needle) => h.norm.includes(needle))
      if (!matches) continue
      const rejected = (cfg.containsReject || []).some((bad) => h.norm.includes(bad))
      if (rejected) continue
      result[field] = h.raw
      used.add(h.raw)
      break
    }
  })

  return result
}

function describeDetection(mapping: Mapping): string {
  const fields: [string, string | null, boolean][] = [
    ['Address', mapping.address, true],
    ['City', mapping.city, false],
    ['State', mapping.state, false],
    ['ZIP', mapping.zip, false],
  ]
  const missing = fields.filter(([, v, optional]) => !v && !optional).map(([name]) => name)
  const found = fields.filter(([, v]) => v).length
  if (missing.length === 0) {
    return `Auto-detected ${found} of 4 columns. Review and adjust below if needed.`
  }
  return `Couldn't auto-detect: ${missing.join(', ')}. Please choose the right column(s) below.`
}

function cellText(v: CellValue): string {
  return v == null || v === '' ? '' : String(v)
}

// ── Network: JSONP (Census sends no CORS headers; a dynamic <script> tag
// bypasses the same-origin policy). Census uses `callback=`; Nominatim uses
// `json_callback=`. This is a network mechanism, not UI state. ───────────────
function jsonpRequest<T>(
  baseUrl: string,
  params: Record<string, string>,
  opts?: { callbackKey?: string; timeoutMs?: number },
): Promise<T | null> {
  const callbackKey = opts?.callbackKey || 'callback'
  const timeoutMs = opts?.timeoutMs || 15000
  return new Promise<T | null>((resolve) => {
    // The JSONP callback is attached to `window` by name; index it as a bag.
    const w = window as unknown as Record<string, unknown>
    const cbName = '__geocb_' + Math.random().toString(36).slice(2) + '_' + Date.now()
    let settled = false
    let script: HTMLScriptElement | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = () => {
      if (settled) return
      settled = true
      try {
        delete w[cbName]
      } catch {
        w[cbName] = undefined
      }
      if (script && script.parentNode) script.parentNode.removeChild(script)
      if (timer) clearTimeout(timer)
    }
    w[cbName] = (data: T) => {
      cleanup()
      resolve(data)
    }
    const qs = new URLSearchParams(params)
    qs.set(callbackKey, cbName)
    script = document.createElement('script')
    script.src = baseUrl + '?' + qs.toString()
    script.onerror = () => {
      cleanup()
      resolve(null)
    }
    timer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, timeoutMs)
    document.head.appendChild(script)
  })
}

function firstCensusMatch(data: CensusResponse | null): Coords | null {
  const m = data?.result?.addressMatches?.[0]
  if (!m) return null
  return { lat: m.coordinates.y, lon: m.coordinates.x }
}

export default function Geocoder() {
  type Step = 'upload' | 'confirm' | 'review'
  const [step, setStep] = useState<Step>('upload')

  const [uploadStatus, setUploadStatus] = useState('No file loaded.')
  const [detectStatus, setDetectStatus] = useState('')
  const [runStatus, setRunStatus] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')

  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [mapping, setMapping] = useState<Mapping>({
    address: null,
    city: null,
    state: null,
    zip: null,
  })

  const [progress, setProgress] = useState({ value: 0, max: 1 })
  const [running, setRunning] = useState(false)
  const [progressVisible, setProgressVisible] = useState(false)

  // Output column keys + the finished rows, populated after a run.
  const [outputHeaders, setOutputHeaders] = useState<string[]>([])
  const [resultRows, setResultRows] = useState<Row[]>([])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Throttle gate for Nominatim, persisted across rows without re-rendering.
  const nominatimNextAllowedAt = useRef(0)
  // Original file name (sans extension) + extension, for the download name.
  const fileMeta = useRef<{ name: string; ext: string }>({ name: 'geocoded', ext: 'xlsx' })

  const canRun = !!mapping.city && !!mapping.state && !!mapping.zip

  // ── Upload → parse → detect ───────────────────────────────────────────────
  const handleFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadStatus('Reading file...')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const parsed = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' })
      if (parsed.length === 0) throw new Error('No rows in spreadsheet.')

      // Headers in sheet order (sheet_to_json preserves first-row insertion).
      const headerSet = new Set<string>()
      parsed.forEach((r) => Object.keys(r).forEach((k) => headerSet.add(k)))
      const newHeaders = Array.from(headerSet)

      fileMeta.current = {
        name: file.name.replace(/\.[^.]+$/, ''),
        ext: (file.name.split('.').pop() || 'xlsx').toLowerCase(),
      }

      const detected = detectMapping(newHeaders)
      setHeaders(newHeaders)
      setRows(parsed)
      setMapping(detected)
      setDetectStatus(
        `Loaded ${parsed.length} row${parsed.length === 1 ? '' : 's'}. ${describeDetection(detected)}`,
      )
      setUploadStatus(`Loaded ${parsed.length} rows from ${file.name}.`)
      setProgressVisible(false)
      setRunStatus('')
      setStep('confirm')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setUploadStatus('Error: ' + msg)
      setRows([])
    }
  }, [])

  const updateMapping = useCallback((field: Field4, value: string) => {
    setMapping((m) => ({ ...m, [field]: value || null }))
  }, [])

  const backToUpload = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploadStatus('No file loaded.')
    setStep('upload')
  }, [])

  // ── Geocoding (three-tier: Census structured → Census oneline → ZIP) ──────
  const nominatimZipCentroid = useCallback(async (zip: string): Promise<Coords | null> => {
    const now = Date.now()
    const wait = Math.max(0, nominatimNextAllowedAt.current - now)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    nominatimNextAllowedAt.current = Date.now() + NOMINATIM_MIN_GAP_MS

    const data = await jsonpRequest<NominatimHit[]>(
      NOMINATIM_SEARCH,
      { postalcode: zip, country: 'US', format: 'json', limit: '1' },
      { callbackKey: 'json_callback' },
    )
    if (!Array.isArray(data) || !data[0]) return null
    const lat = parseFloat(data[0].lat)
    const lon = parseFloat(data[0].lon)
    if (!isFinite(lat) || !isFinite(lon)) return null
    return { lat, lon }
  }, [])

  const geocodeRow = useCallback(
    async (
      row: Row,
      addressCol: string | null,
      cityCol: string,
      stateCol: string,
      zipCol: string,
    ): Promise<Coords | null> => {
      const cityStr = String(row[cityCol] ?? '').trim()
      const stateStr = String(row[stateCol] ?? '').trim()
      const zipRaw = row[zipCol]
      // Excel often stores zips as floats; strip a trailing ".0" defensively.
      const zipStr = String(zipRaw == null ? '' : zipRaw)
        .trim()
        .replace(/\.0+$/, '')
      // Digits-only, first 5: handles ZIP+4 and ranges for the ZIP fallback.
      const zipDigits = (zipStr.match(/\d/g) || []).join('').slice(0, 5)
      const streetStr = addressCol ? String(row[addressCol] ?? '').trim() : ''

      if (!cityStr && !stateStr && !zipStr && !streetStr) return null

      // Tier 1: full structured address via Census.
      if (streetStr && cityStr && stateStr) {
        const data = await jsonpRequest<CensusResponse>(CENSUS_STRUCTURED, {
          street: streetStr,
          city: cityStr,
          state: stateStr,
          zip: zipStr,
          benchmark: BENCHMARK,
          format: 'json',
        })
        const hit = firstCensusMatch(data)
        if (hit) return hit
      }

      // Tier 2: oneline "city, state [zip]" via Census.
      if (cityStr && stateStr) {
        const oneline = (cityStr + ', ' + stateStr + (zipStr ? ' ' + zipStr : '')).trim()
        const data = await jsonpRequest<CensusResponse>(CENSUS_ONELINE, {
          address: oneline,
          benchmark: BENCHMARK,
          format: 'json',
        })
        const hit = firstCensusMatch(data)
        if (hit) return hit
      }

      // Tier 3 (last resort): ZIP centroid via Nominatim (Census rejects a
      // bare ZIP). Use the digit-normalized 5-digit ZIP.
      if (zipDigits.length === 5) {
        const r = await nominatimZipCentroid(zipDigits)
        if (r) return r
      }

      return null
    },
    [nominatimZipCentroid],
  )

  const runGeocode = useCallback(async () => {
    if (rows.length === 0 || !canRun) return
    const addressCol = mapping.address
    const cityCol = mapping.city!
    const stateCol = mapping.state!
    const zipCol = mapping.zip!

    // Pick non-clashing output column names so source data is never overwritten.
    const headerLower = new Set(headers.map((h) => String(h).toLowerCase()))
    const latKey = headerLower.has('latitude') ? 'latitude_geocoded' : 'latitude'
    const lonKey = headerLower.has('longitude') ? 'longitude_geocoded' : 'longitude'

    setRunning(true)
    setProgressVisible(true)
    setProgress({ value: 0, max: rows.length })

    // Work on copies so React state updates are clean.
    const working: Row[] = rows.map((r) => ({ ...r }))
    let matched = 0
    for (let i = 0; i < working.length; i++) {
      setRunStatus(`Geocoding ${i + 1} of ${working.length}...`)
      const coords = await geocodeRow(working[i], addressCol, cityCol, stateCol, zipCol)
      working[i][latKey] = coords ? coords.lat : ''
      working[i][lonKey] = coords ? coords.lon : ''
      if (coords) matched++
      setProgress({ value: i + 1, max: working.length })
    }

    const outHeaders = headers.concat([latKey, lonKey])
    setRunStatus(`Geocoded ${matched} of ${working.length} rows.`)
    setReviewStatus(
      `Matched ${matched} of ${working.length} row${working.length === 1 ? '' : 's'}. Showing the first ${Math.min(
        PREVIEW_ROWS,
        working.length,
      )}.`,
    )
    setOutputHeaders(outHeaders)
    setResultRows(working)
    setRunning(false)
    setStep('review')
  }, [rows, canRun, mapping, headers, geocodeRow])

  const download = useCallback(() => {
    if (resultRows.length === 0) return
    const ws = XLSX.utils.json_to_sheet(resultRows, { header: outputHeaders })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const { name, ext } = fileMeta.current
    const bookType: BookType = ext === 'csv' ? 'csv' : 'xlsx'
    XLSX.writeFile(wb, `${name}_geocoded.${ext}`, { bookType })
  }, [resultRows, outputHeaders])

  const restart = useCallback(() => {
    setRows([])
    setHeaders([])
    setMapping({ address: null, city: null, state: null, zip: null })
    setResultRows([])
    setOutputHeaders([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.disabled = false
    }
    setRunning(false)
    setProgressVisible(false)
    setProgress({ value: 0, max: 1 })
    setRunStatus('')
    setReviewStatus('')
    setDetectStatus('')
    setUploadStatus('No file loaded.')
    setStep('upload')
  }, [])

  const previewRows = useMemo(() => rows.slice(0, PREVIEW_ROWS), [rows])
  const resultPreviewRows = useMemo(() => resultRows.slice(0, PREVIEW_ROWS), [resultRows])

  // ── Render ────────────────────────────────────────────────────────────────
  const renderSelect = (field: Field4, label: string, includeNone: boolean) => {
    const noneLabel = includeNone ? '— none —' : '— select a column —'
    return (
      <Field label={label} htmlFor={`map-${field}`}>
        <select
          id={`map-${field}`}
          className={styles.select}
          value={mapping[field] ?? ''}
          onChange={(e) => updateMapping(field, e.target.value)}
          disabled={running}
        >
          <option value="">{noneLabel}</option>
          {headers.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </Field>
    )
  }

  const renderPreviewTable = (cols: string[], data: Row[]) => (
    <div className={styles.tableWrap}>
      <Table variant="compact">
        <thead>
          <tr>
            {cols.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {cols.map((h) => (
                <td key={h}>{cellText(row[h])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )

  return (
    <section className={styles.app}>
      <header className={styles.header}>
        <h2 className={styles.title}>Geocoder</h2>
        <p className={styles.intro}>
          Upload a spreadsheet of U.S. addresses and the tool will append{' '}
          <code>latitude</code> and <code>longitude</code> columns. Column names don't
          have to match exactly — we'll try to identify which columns hold the address,
          city, state, and ZIP code, and let you confirm or override the mapping. If a
          street address isn't available, we'll geocode using City + State + ZIP instead.
          Runs entirely in your browser; addresses are sent only to the U.S. Census public
          geocoding endpoint.
        </p>
        <p className={styles.back}>
          <Button variant="ghost" href="#code">
            ← Back to Code &amp; Data
          </Button>
        </p>
      </header>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Panel className={styles.card}>
          <section className={styles.step}>
            <label className={styles.label} htmlFor="file-input">
              1. Choose a file
            </label>
            <input
              ref={fileInputRef}
              id="file-input"
              className={styles.file}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
            />
            <p className={styles.status}>{uploadStatus}</p>
          </section>
        </Panel>
      )}

      {/* Step 2: Confirm column mapping */}
      {step === 'confirm' && (
        <Panel className={styles.card}>
          <section className={styles.step}>
            <span className={styles.label}>2. Confirm column mapping</span>
            <p className={styles.status}>{detectStatus}</p>
            {renderPreviewTable(headers, previewRows)}
          </section>

          <section className={styles.step}>
            <span className={styles.label}>Which columns are which?</span>
            <div className={styles.mappingGrid}>
              {renderSelect('address', 'Address (optional)', true)}
              {renderSelect('city', 'City', false)}
              {renderSelect('state', 'State', false)}
              {renderSelect('zip', 'ZIP Code', false)}
            </div>
            <p className={styles.helperText}>
              Leave Address as — none — and we'll geocode by City + State + ZIP.
            </p>
          </section>

          <section className={`${styles.step} ${styles.actions}`}>
            <Button variant="ghost" onClick={backToUpload} disabled={running}>
              ← Choose a different file
            </Button>
            <Button variant="primary" onClick={runGeocode} disabled={!canRun || running}>
              Geocode
            </Button>
          </section>

          {progressVisible && (
            <section className={styles.step}>
              <span className={styles.label}>Progress</span>
              <p className={styles.status}>{runStatus}</p>
              <progress className={styles.progress} value={progress.value} max={progress.max} />
            </section>
          )}
        </Panel>
      )}

      {/* Step 3: Review & download */}
      {step === 'review' && (
        <Panel className={styles.card}>
          <section className={styles.step}>
            <span className={styles.label}>3. Review &amp; download</span>
            <p className={styles.status}>{reviewStatus}</p>
            {renderPreviewTable(outputHeaders, resultPreviewRows)}
          </section>

          <section className={`${styles.step} ${styles.actions}`}>
            <Button variant="ghost" onClick={restart}>
              Start over
            </Button>
            <Button variant="primary" onClick={download}>
              Download
            </Button>
          </section>
        </Panel>
      )}
    </section>
  )
}
