import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { DeckStage } from '@/components/DeckStage/DeckStage'
import type { DeckSlide } from '@/components/DeckStage/DeckStage'

/*
 * "Baumol's Disease and Monetary Policy" — ported from the Claude Design deck
 * of the same name (project 7e6f70bb, `Baumol Cost Disease Deck.dc.html`).
 *
 * The design-canvas original runs on a template runtime that pulls React,
 * ReactDOM and Babel from a CDN at page load; the slides themselves are plain
 * inline-styled HTML/SVG over this site's own design tokens. Only the runtime
 * was replaced — the markup, the build sequence and the numbers are the
 * original's. Inline styles are kept because the source markup is inline-styled
 * against a fixed 1920x1080 canvas.
 */

const CANVAS_W = 1920
const CANVAS_H = 1080
const BUILD_SPEED = 1 // multiplier on every build animation; 1 = as authored

// Slide positions the build logic keys off.
const QUARTET = 2
const COST_DISEASE = 3
const APPENDIX_WAGES = 7
const APPENDIX_HEALTH = 8

const START_YEAR = 1776
const END_YEAR = 2026
const YEAR_ANIM_MS = 2400

/* ── Appendix A: cumulative % change since 1973 (annual, 1973–2014) ── */
const MED = [0,-2,-0.5,0.4,1.3,2.5,1.9,1.1,-1.2,0.5,0.4,0.7,1.7,3.8,3.4,2.7,2.6,2.6,3.6,5.2,4.5,2.4,0.7,-0.4,1.4,4.0,7.1,6.8,9.6,11.3,13.3,13.6,12.5,12.3,11.0,11.6,14.0,12.7,9.6,8.5,9.6,8.7]
const NET = [0,-1.6,0.6,3.4,4.6,5.6,5.8,5.0,7.2,5.7,8.8,11.7,13.6,15.9,16.5,17.8,18.8,20.4,21.4,25.8,26.2,27.4,27.5,30.6,32.4,35.0,38.3,41.6,43.8,47.8,52.6,56.7,59.4,60.4,61.5,61.8,65.1,70.0,70.2,71.1,71.2,72.2]
const PROD = [0,0.1,1.2,3.1,4.5,5.4,6.6,7.9,8.6,9.7,10.0,10.8,12.6,16.3,18.1,19.9,19.1,21.8,23.4,27.3,26.5,25.7,25.6,28.0,29.8,34.7,38.2,43.8,46.6,47.9,51.1,53.9,54.6,56.1,58.4,59.8,60.9,61.9,61.6,62.4,61.8,63.3]

const wagePts = (a: number[]) =>
  a.map((val, i) => `${(120 + (i * 1300) / 41).toFixed(1)},${(580 - ((val + 5) / 85) * 540).toFixed(1)}`).join(' ')

const MED_PTS = wagePts(MED)
const NET_PTS = wagePts(NET)
const PROD_PTS = wagePts(PROD)

/* ── Slide 2: employment IRF to a monetary policy shock, by sample ── */
const PRE_R = [0,-0.00142758,-0.00249911,-0.00334447,0.00126559,0.00485675,0.00836456,0.01127312,0.01621205,0.02590481,0.02974528,0.0372615,0.04576926,0.0562616,0.06800557,0.07318067,0.07675116,0.08543321,0.08919745,0.09398652]
const PRE_L = [0,-0.00841703,-0.01233274,-0.0159208,-0.01667473,-0.01337773,-0.01276467,-0.0121029,-0.00648176,0.00281932,0.00516205,0.0118471,0.02070149,0.02986913,0.03829199,0.04127897,0.04269475,0.04948862,0.05002356,0.05149643]
const PRE_U = [0,0.00673037,0.00951782,0.01307626,0.02080581,0.02792353,0.03535032,0.04038383,0.04688808,0.05450775,0.05862382,0.06607048,0.07300862,0.08152058,0.09180568,0.09647489,0.0989653,0.10846808,0.11035979,0.1140332]
const POST_R = [0,-0.22919734,-0.20857358,-0.12070257,-0.08573964,-0.13426276,-0.15215845,-0.13107554,-0.19908561,-0.20408016,-0.20594072,-0.21763674,-0.20457589,-0.21622514,-0.22568319,-0.20752308,-0.19328292,-0.20178514,-0.20393737,-0.19162264]
const POST_L = [0,-0.28393308,-0.29464069,-0.22303595,-0.17203675,-0.23131308,-0.26439527,-0.24623665,-0.31704715,-0.33377311,-0.3344666,-0.35345147,-0.35048372,-0.36725642,-0.38674925,-0.36978336,-0.35249843,-0.36723113,-0.37287147,-0.35806278]
const POST_U = [0,-0.14929517,-0.08492108,0.01059267,0.04152066,0.00169217,-0.009804,0.01003015,-0.04160729,-0.0328446,-0.02548107,-0.03834576,-0.0213036,-0.02989678,-0.03047958,-0.01138605,-0.0023015,-0.00811426,0.00278763,0.01895069]

const irfPts = (a: number[]) =>
  a.map((val, i) => `${(90 + (i * 880) / 19).toFixed(1)},${(30 + ((0.15 - val) / 0.55) * 530).toFixed(1)}`).join(' ')

const IRF_PRE = irfPts(PRE_R)
const IRF_PRE_LO = irfPts(PRE_L)
const IRF_PRE_HI = irfPts(PRE_U)
const IRF_POST = irfPts(POST_R)
const IRF_POST_LO = irfPts(POST_L)
const IRF_POST_HI = irfPts(POST_U)

/* ── Appendix B: hospitals, 1993–2022, index 1993 = 100 ── */
const PROD_H = [100,101.046,107.518,108.915,108.918,109.067,113.167,115.459,117.047,116.722,113.539,111.885,110.94,111.667,106.855,106.717,107.218,106.075,108.281,108.085,107.479,107.691,107.266,106.896,107.054,105.954,106.568,99.111,103.587,101.564]
const HRS_H = [100,100.018,99.947,100.691,103.086,105.533,105.95,106.937,110.186,112.575,117.318,119.931,123.485,125.464,129.01,133.394,132.627,133.555,134.417,135.405,135.895,136.699,140.376,144.164,146.344,148.582,150.716,148.504,149.232,149.729]
const OUT_H = [100,101.062,107.46,109.666,112.279,115.103,119.898,123.467,128.968,131.399,133.202,134.183,136.994,140.1,137.852,142.353,142.198,141.668,145.546,146.351,146.058,147.211,150.575,154.105,156.666,157.428,160.613,147.183,154.584,152.07]

const hospPts = (a: number[]) =>
  a.map((val, i) => `${(120 + (i * 1300) / 29).toFixed(1)},${(580 - ((val - 95) / 70) * 540).toFixed(1)}`).join(' ')

const HOSP_PROD = hospPts(PROD_H)
const HOSP_HRS = hospPts(HRS_H)
const HOSP_OUT = hospPts(OUT_H)

/** A slide button that swaps to `hoverStyle` on hover/focus — the deck's markup
 *  carries its hover treatment inline, so it cannot live in a stylesheet. */
function HoverButton({
  style,
  hoverStyle,
  children,
  ...rest
}: {
  style: CSSProperties
  hoverStyle: CSSProperties
  title?: string
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  children: ReactNode
}) {
  const [hot, setHot] = useState(false)
  return (
    <button
      type="button"
      style={hot ? { ...style, ...hoverStyle } : style}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      {...rest}
    >
      {children}
    </button>
  )
}

export default function BaumolCostDiseaseDeck() {
  const [index, setIndex] = useState(0)
  const [s2, setS2] = useState(0) // quartet build, 0–4
  const [s3, setS3] = useState(0) // cost-disease pie build, 0–3
  const [lv, setLv] = useState(0) // musicians who have left for the factory, 0–3
  const [year, setYear] = useState(START_YEAR)
  const [median, setMedian] = useState(false)

  const exodusTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const yearFrame = useRef<number | null>(null)

  const stopExodus = useCallback(() => {
    exodusTimers.current.forEach(clearTimeout)
    exodusTimers.current = []
  }, [])

  const startExodus = useCallback(() => {
    stopExodus()
    const sp = 1 / BUILD_SPEED
    exodusTimers.current = [1, 2, 3].map((k) =>
      setTimeout(() => setLv(k), (400 + (k - 1) * 1000) * sp),
    )
  }, [stopExodus])

  const stopYear = useCallback(() => {
    if (yearFrame.current !== null) cancelAnimationFrame(yearFrame.current)
    yearFrame.current = null
  }, [])

  // Run the clock from 1776 to 2026 while the quartet on screen does not change.
  const animYear = useCallback(() => {
    stopYear()
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setYear(END_YEAR)
      return
    }
    const dur = YEAR_ANIM_MS / BUILD_SPEED
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setYear(Math.round(START_YEAR + eased * (END_YEAR - START_YEAR)))
      yearFrame.current = p < 1 ? requestAnimationFrame(step) : null
    }
    yearFrame.current = requestAnimationFrame(step)
  }, [stopYear])

  /** Advance the quartet slide's build one step. Returns false once it is done. */
  const buildStep = useCallback(() => {
    if (s2 >= 4) return false
    if (s2 === 0) animYear()
    if (s2 === 2) {
      startExodus()
    } else {
      stopExodus()
      if (lv) setLv(0)
    }
    setS2((n) => n + 1)
    return true
  }, [s2, lv, animYear, startExodus, stopExodus])

  // While the quartet slide still has build steps left, they consume the
  // advance instead of moving the deck on.
  const handleAdvance = useCallback(
    () => (index === QUARTET ? buildStep() : false),
    [index, buildStep],
  )

  // The cost-disease pies grow themselves on arrival and reset on departure.
  useEffect(() => {
    if (index !== COST_DISEASE) {
      setS3(0)
      return
    }
    const sp = 1 / BUILD_SPEED
    const timers = [1, 2, 3].map((k) =>
      setTimeout(() => setS3((cur) => Math.max(cur, k)), (150 + (k - 1) * 500) * sp),
    )
    return () => timers.forEach(clearTimeout)
  }, [index])

  useEffect(
    () => () => {
      stopExodus()
      stopYear()
    },
    [stopExodus, stopYear],
  )

  const go = (n: number) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setIndex(n)
  }

  const eqBorder = s2 >= 3 ? 'transparent' : 'var(--ink)'
  const v = {
    year,
    eraBg: year >= 1950 ? 'var(--deck-panel-cool)' : 'var(--deck-panel-warm)',
    aOp: s2 >= 2 ? 0 : 1,
    bOp: s2 >= 2 ? 1 : 0,
    wOp: s2 >= 2 ? 1 : 0,
    fOp: s2 >= 2 ? 1 : 0,
    takeOp: s2 >= 4 ? 1 : 0,
    mOp: s2 >= 4 ? 1 : 0,
    wage26: s2 >= 4 ? '$45 / hr' : '$3 / hr',
    eqLabelOp: s2 >= 3 ? 0 : 1,
    eqBorder,
    qShift: s2 >= 2 ? -40 : 0,
    gA: s2 === 3 && lv >= 3 ? 0.2 : 1,
    gB: s2 === 3 && lv >= 2 ? 0.2 : 1,
    gC: s2 === 3 && lv >= 1 ? 0.2 : 1,
    q1: s2 === 3 && lv >= 1 ? 1 : 0,
    q2: s2 === 3 && lv >= 2 ? 1 : 0,
    q3: s2 === 3 && lv >= 3 ? 1 : 0,
    s2label: s2 >= 4 ? '⟲' : '▸',
    adv2: (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      if (s2 >= 4) {
        stopExodus()
        stopYear()
        setS2(0)
        setLv(0)
        setYear(START_YEAR)
        return
      }
      buildStep()
    },
    p1: s3 >= 1 ? 1 : 0,
    p2: s3 >= 2 ? 1 : 0,
    p3: s3 >= 3 ? 1 : 0,
    medOp: median ? 1 : 0,
    medLabel: median ? 'Hide median series' : 'Show median series',
    toggleMed: (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      setMedian((on) => !on)
    },
    netPts: NET_PTS,
    prodPts: PROD_PTS,
    medPts: MED_PTS,
    irfPre: IRF_PRE,
    irfPreLo: IRF_PRE_LO,
    irfPreHi: IRF_PRE_HI,
    irfPost: IRF_POST,
    irfPostLo: IRF_POST_LO,
    irfPostHi: IRF_POST_HI,
    hospProd: HOSP_PROD,
    hospHrs: HOSP_HRS,
    hospOut: HOSP_OUT,
    goA: go(APPENDIX_WAGES),
    goB: go(APPENDIX_HEALTH),
    back1: go(QUARTET),
    back2: go(COST_DISEASE),
  }

  const slides: DeckSlide[] = [
    {
      label: "Title",
      notes:
        "Welcome. Today: why the least innovative corners of the economy keep getting more expensive, and what that means for monetary policy. Three stops: a string quartet, the healthcare sector, and a central bank.",
      content: (
        <section style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', padding: '100px 110px 90px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '30px' }}>
            <h1 style={{ fontSize: '116px', lineHeight: '1.04', margin: '0', maxWidth: '1700px', fontWeight: '600' }}>
              Baumol’s Disease and Monetary Policy
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '44px', alignItems: 'baseline', fontFamily: 'var(--font-mono)', fontSize: '28px', borderTop: '1px solid var(--ink)', paddingTop: '28px' }}>
            <span>
              Michael Dwight Sparks
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              August 18, 2026
            </span>
          </div>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '8px', background: 'var(--deck-rail)' }}>
            <div style={{ width: '14%', height: '100%', background: 'var(--deck-rail-fill)' }}>
            </div>
          </div>
        </section>
      ),
    },
    {
      label: "Monetary Policy",
      notes:
        "Monetary policy: the tools a central bank uses to control the money supply. Several tools, but the one we think about and see most often is the federal funds rate. Textbook playbook: inflation high, raise rates; unemployment high, lower rates. Then the eye-popper: something happened in 1984 that breaks this. We would hope to see a relationship between monetary policy and employment \u2014 that is the channel through which policy affects inflation. We don't see it anymore. IRF of employment to a policy shock: 1968-1984 vs 1985-2026 \u2014 the break is visible.",
      content: (
        <section style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', padding: '80px 100px 100px', display: 'flex', flexDirection: 'column', gap: '26px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '60px', margin: '0', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: '0' }}>
            Monetary Policy
          </h2>
          <div style={{ fontSize: '33px', lineHeight: '1.45', maxWidth: '1620px', borderLeft: '4px solid var(--text-emph)', paddingLeft: '28px' }}>
            <span>
              The tools available to a central bank for controlling the money supply of an economy. There are several — the one we think about, and see most frequently, is the
              {' '}
              <span style={{ fontWeight: '600' }}>
                federal funds rate
              </span>
              .
            </span>
          </div>
          <div style={{ flex: '1', display: 'grid', gridTemplateColumns: '600px 1fr', gap: '70px', minHeight: '0', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '34px' }}>
              <div style={{ border: '1px solid var(--ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 24px', borderBottom: '1px solid var(--ink-muted)', fontSize: '28px' }}>
                  <span style={{ flex: '1' }}>
                    Inflation running high
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    →
                  </span>
                  <span style={{ flex: '1', textAlign: 'right', fontWeight: '600', color: 'var(--respectRed)' }}>
                    raise rates
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 24px', fontSize: '28px' }}>
                  <span style={{ flex: '1' }}>
                    Unemployment running high
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    →
                  </span>
                  <span style={{ flex: '1', textAlign: 'right', fontWeight: '600', color: 'var(--text-emph)' }}>
                    lower rates
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '30px', lineHeight: '1.5', fontWeight: '600', color: 'var(--text-emph-2)' }}>
                What explains the empirical decoupling of interest rates and employment?
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '0' }}>
              <div style={{ fontSize: '26px', color: 'var(--text-secondary)' }}>
                Employment response to a monetary policy shock
              </div>
              <svg viewBox="0 0 1040 640" style={{ width: '100%' }}>
                <line x1="90" y1="78" x2="970" y2="78" stroke="var(--Res-gray1)" strokeOpacity="0.35" strokeWidth="2">
                </line>
                <line x1="90" y1="271" x2="970" y2="271" stroke="var(--Res-gray1)" strokeOpacity="0.35" strokeWidth="2">
                </line>
                <line x1="90" y1="367" x2="970" y2="367" stroke="var(--Res-gray1)" strokeOpacity="0.35" strokeWidth="2">
                </line>
                <line x1="90" y1="464" x2="970" y2="464" stroke="var(--Res-gray1)" strokeOpacity="0.35" strokeWidth="2">
                </line>
                <line x1="90" y1="560" x2="970" y2="560" stroke="var(--Res-gray1)" strokeOpacity="0.35" strokeWidth="2">
                </line>
                <line x1="90" y1="174.5" x2="970" y2="174.5" stroke="var(--ink)" strokeWidth="2.5">
                </line>
                <text x="76" y="86" textAnchor="end" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  0.1
                </text>
                <text x="76" y="182" textAnchor="end" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  0
                </text>
                <text x="76" y="279" textAnchor="end" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  -0.1
                </text>
                <text x="76" y="375" textAnchor="end" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  -0.2
                </text>
                <text x="76" y="472" textAnchor="end" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  -0.3
                </text>
                <text x="76" y="568" textAnchor="end" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  -0.4
                </text>
                <text x="90" y="608" textAnchor="middle" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  0
                </text>
                <text x="321" y="608" textAnchor="middle" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  5
                </text>
                <text x="553" y="608" textAnchor="middle" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  10
                </text>
                <text x="785" y="608" textAnchor="middle" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  15
                </text>
                <text x="970" y="608" textAnchor="middle" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  19
                </text>
                <text x="1000" y="640" textAnchor="end" fontSize="23" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  quarters after shock
                </text>
                <polyline points={v.irfPreLo} fill="none" stroke="var(--Res-blue1)" strokeWidth="3" strokeDasharray="9 8">
                </polyline>
                <polyline points={v.irfPreHi} fill="none" stroke="var(--Res-blue1)" strokeWidth="3" strokeDasharray="9 8">
                </polyline>
                <polyline points={v.irfPostLo} fill="none" stroke="var(--Res-orange1)" strokeWidth="3" strokeDasharray="9 8">
                </polyline>
                <polyline points={v.irfPostHi} fill="none" stroke="var(--Res-orange1)" strokeWidth="3" strokeDasharray="9 8">
                </polyline>
                <polyline points={v.irfPre} fill="none" stroke="var(--Res-blue1)" strokeWidth="6">
                </polyline>
                <polyline points={v.irfPost} fill="none" stroke="var(--Res-orange1)" strokeWidth="6">
                </polyline>
                <text x="820" y="52" fontSize="27" fontWeight="600" fill="var(--Res-blue1)" fontFamily="var(--font-mono)">
                  1968–1984
                </text>
                <text x="790" y="440" fontSize="27" fontWeight="600" fill="var(--Res-orange1)" fontFamily="var(--font-mono)">
                  1985–2026
                </text>
              </svg>
            </div>
          </div>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '8px', background: 'var(--deck-rail)' }}>
            <div style={{ width: '29%', height: '100%', background: 'var(--deck-rail-fill)' }}>
            </div>
          </div>
        </section>
      ),
    },
    {
      label: "The Quartet",
      screenLabel: "A String Quartet, 1776-2026",
      notes:
        "Build 1: run the clock from 1776 to 2026 \u2014 the equation and the $3 wage sit on screen and do not move while the year spins: nothing about the performance changes. Build 2: the side-by-side comparison with wages ($3/hr real on BOTH sides) and the factory next door already offering $45/hr \u2014 far more productive labor. Build 3: the musicians start leaving for the factory one at a time, each ghosting out of the quartet as they queue up next door. Build 4: to keep them the quartet matches the factory wage \u2014 $3 becomes $45 \u2014 and they return and stay. Pay is set by opportunity cost, not by the quartet's own productivity. Output per hour is fixed, so the higher wage can only come from a higher ticket price. Appendix button defends 'wages track productivity' if challenged.",
      content: (
        <section style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', padding: '80px 100px 100px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: '60px', margin: '0', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: '0' }}>
              A String Quartet, 1776 → 2026
            </h2>
            <HoverButton onClick={v.goA} style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', padding: '10px 22px', border: '1px solid var(--ink)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '0' }} hoverStyle={{ background: 'var(--ink)', color: 'var(--bg)' }}>
              Appendix: wages & productivity ›
            </HoverButton>
          </div>
          <div style={{ position: 'relative', flex: '1', marginTop: '36px' }}>
            <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', opacity: v.aOp, transition: 'opacity .8s,background 1.2s', background: v.eraBg, border: '1px solid var(--ink)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '110px', fontWeight: '600', lineHeight: '1' }}>
                {v.year}
              </div>
              <svg viewBox="0 0 620 240" style={{ width: '500px' }}>
                <g transform="translate(0,10)">
                  <circle cx="60" cy="42" r="20" fill="var(--ink)">
                  </circle>
                  <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                  </path>
                  <ellipse cx="100" cy="86" rx="14" ry="24" fill="var(--gold)" transform="rotate(-50 100 86)">
                  </ellipse>
                  <line x1="112" y1="70" x2="136" y2="42" stroke="var(--deck-accent-warm)" strokeWidth="6">
                  </line>
                </g>
                <g transform="translate(150,10)">
                  <circle cx="60" cy="42" r="20" fill="var(--ink)">
                  </circle>
                  <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                  </path>
                  <ellipse cx="100" cy="86" rx="14" ry="24" fill="var(--gold)" transform="rotate(-50 100 86)">
                  </ellipse>
                  <line x1="112" y1="70" x2="136" y2="42" stroke="var(--deck-accent-warm)" strokeWidth="6">
                  </line>
                </g>
                <g transform="translate(300,10)">
                  <circle cx="60" cy="42" r="20" fill="var(--ink)">
                  </circle>
                  <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                  </path>
                  <ellipse cx="102" cy="90" rx="16" ry="27" fill="var(--gold)" transform="rotate(-50 102 90)">
                  </ellipse>
                  <line x1="114" y1="72" x2="140" y2="42" stroke="var(--deck-accent-warm)" strokeWidth="6">
                  </line>
                </g>
                <g transform="translate(450,10)">
                  <circle cx="60" cy="42" r="20" fill="var(--ink)">
                  </circle>
                  <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                  </path>
                  <ellipse cx="60" cy="160" rx="28" ry="44" fill="var(--gold)">
                  </ellipse>
                  <rect x="56" y="84" width="8" height="46" fill="var(--deck-accent-warm)">
                  </rect>
                </g>
              </svg>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '27px' }}>
                <span style={{ whiteSpace: 'nowrap' }}>
                  Labor productivity =
                </span>
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '27px', lineHeight: '1.25' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', letterSpacing: '2px', color: 'var(--text-emph)' }}>
                    OUTPUT · AUDIENCE
                  </span>
                  <span style={{ border: '2px solid var(--ink)', padding: '2px 26px', margin: '5px 0', fontWeight: '600' }}>
                    14
                  </span>
                  <span style={{ borderTop: '3px solid var(--ink)', width: '100%' }}>
                  </span>
                  <span style={{ border: '2px solid var(--ink)', padding: '2px 14px', margin: '5px 0', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '24px' }}>
                      (4 × 30 min)
                    </span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', letterSpacing: '2px', color: 'var(--text-emph)' }}>
                    LABOR HOURS
                  </span>
                </span>
                <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                  = 7 / labor-hour
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '40px', fontWeight: '600', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                  $3 / hr
                </div>
                <div style={{ fontSize: '24px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  real wage per musician (illustrative)
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', inset: '0', display: 'grid', gridTemplateColumns: '1fr 1fr', opacity: v.bOp, transition: 'opacity .8s' }}>
              <div style={{ background: 'var(--deck-panel-warm)', border: '1px solid var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '34px 30px 130px', gap: '22px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '46px', fontWeight: '600' }}>
                  1776
                </div>
                <svg viewBox="0 0 620 240" style={{ width: '460px' }}>
                  <g transform="translate(0,10)">
                    <circle cx="60" cy="42" r="20" fill="var(--ink)">
                    </circle>
                    <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                    </path>
                    <ellipse cx="100" cy="86" rx="14" ry="24" fill="var(--gold)" transform="rotate(-50 100 86)">
                    </ellipse>
                    <line x1="112" y1="70" x2="136" y2="42" stroke="var(--deck-accent-warm)" strokeWidth="6">
                    </line>
                  </g>
                  <g transform="translate(150,10)">
                    <circle cx="60" cy="42" r="20" fill="var(--ink)">
                    </circle>
                    <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                    </path>
                    <ellipse cx="100" cy="86" rx="14" ry="24" fill="var(--gold)" transform="rotate(-50 100 86)">
                    </ellipse>
                    <line x1="112" y1="70" x2="136" y2="42" stroke="var(--deck-accent-warm)" strokeWidth="6">
                    </line>
                  </g>
                  <g transform="translate(300,10)">
                    <circle cx="60" cy="42" r="20" fill="var(--ink)">
                    </circle>
                    <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                    </path>
                    <ellipse cx="102" cy="90" rx="16" ry="27" fill="var(--gold)" transform="rotate(-50 102 90)">
                    </ellipse>
                    <line x1="114" y1="72" x2="140" y2="42" stroke="var(--deck-accent-warm)" strokeWidth="6">
                    </line>
                  </g>
                  <g transform="translate(450,10)">
                    <circle cx="60" cy="42" r="20" fill="var(--ink)">
                    </circle>
                    <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                    </path>
                    <ellipse cx="60" cy="160" rx="28" ry="44" fill="var(--gold)">
                    </ellipse>
                    <rect x="56" y="84" width="8" height="46" fill="var(--deck-accent-warm)">
                    </rect>
                  </g>
                </svg>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '27px' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    Labor productivity =
                  </span>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '27px', lineHeight: '1.25' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', letterSpacing: '2px', color: 'var(--text-emph)', opacity: v.eqLabelOp, transition: 'opacity .6s' }}>
                      OUTPUT · AUDIENCE
                    </span>
                    <span style={{ border: `2px solid ${v.eqBorder}`, transition: 'border-color .6s', padding: '2px 26px', margin: '5px 0', fontWeight: '600' }}>
                      14
                    </span>
                    <span style={{ borderTop: '3px solid var(--ink)', width: '100%' }}>
                    </span>
                    <span style={{ border: `2px solid ${v.eqBorder}`, transition: 'border-color .6s', padding: '2px 14px', margin: '5px 0', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '24px' }}>
                        (4 × 30 min)
                      </span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', letterSpacing: '2px', color: 'var(--text-emph)', opacity: v.eqLabelOp, transition: 'opacity .6s' }}>
                      LABOR HOURS
                    </span>
                  </span>
                  <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                    = 7 / labor-hour
                  </span>
                </div>
                <div style={{ opacity: v.wOp, transition: 'opacity .8s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '44px', fontWeight: '600', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                    $3 / hr
                  </div>
                  <div style={{ fontSize: '24px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    real wage per musician (illustrative)
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--deck-panel-cool)', border: '1px solid var(--ink)', borderLeft: 'none', position: 'relative', display: 'flex', padding: '34px 30px 130px', overflow: 'hidden' }}>
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px', transform: `translateX(${v.qShift}px)`, transition: 'transform 1s ease' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '46px', fontWeight: '600' }}>
                    2026
                  </div>
                  <svg viewBox="0 0 620 240" style={{ width: '460px' }}>
                    <g transform="translate(0,10)" style={{ transition: 'opacity 1s', opacity: v.gA }}>
                      <circle cx="60" cy="42" r="20" fill="var(--ink)">
                      </circle>
                      <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                      </path>
                      <ellipse cx="100" cy="86" rx="14" ry="24" fill="var(--gold)" transform="rotate(-50 100 86)">
                      </ellipse>
                      <line x1="112" y1="70" x2="136" y2="42" stroke="var(--deck-accent-warm)" strokeWidth="6">
                      </line>
                    </g>
                    <g transform="translate(150,10)" style={{ transition: 'opacity 1s', opacity: v.gB }}>
                      <circle cx="60" cy="42" r="20" fill="var(--ink)">
                      </circle>
                      <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                      </path>
                      <ellipse cx="100" cy="86" rx="14" ry="24" fill="var(--gold)" transform="rotate(-50 100 86)">
                      </ellipse>
                      <line x1="112" y1="70" x2="136" y2="42" stroke="var(--deck-accent-warm)" strokeWidth="6">
                      </line>
                    </g>
                    <g transform="translate(300,10)" style={{ transition: 'opacity 1s', opacity: v.gC }}>
                      <circle cx="60" cy="42" r="20" fill="var(--ink)">
                      </circle>
                      <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                      </path>
                      <ellipse cx="102" cy="90" rx="16" ry="27" fill="var(--gold)" transform="rotate(-50 102 90)">
                      </ellipse>
                      <line x1="114" y1="72" x2="140" y2="42" stroke="var(--deck-accent-warm)" strokeWidth="6">
                      </line>
                    </g>
                    <g transform="translate(450,10)">
                      <circle cx="60" cy="42" r="20" fill="var(--ink)">
                      </circle>
                      <path d="M36 66 h48 v100 h-48 z" fill="var(--ink)">
                      </path>
                      <ellipse cx="60" cy="160" rx="28" ry="44" fill="var(--gold)">
                      </ellipse>
                      <rect x="56" y="84" width="8" height="46" fill="var(--deck-accent-warm)">
                      </rect>
                    </g>
                  </svg>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '27px' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      Labor productivity =
                    </span>
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '27px', lineHeight: '1.25' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', letterSpacing: '2px', color: 'var(--text-emph)', opacity: v.eqLabelOp, transition: 'opacity .6s' }}>
                        OUTPUT · AUDIENCE
                      </span>
                      <span style={{ border: `2px solid ${v.eqBorder}`, transition: 'border-color .6s', padding: '2px 26px', margin: '5px 0', fontWeight: '600' }}>
                        14
                      </span>
                      <span style={{ borderTop: '3px solid var(--ink)', width: '100%' }}>
                      </span>
                      <span style={{ border: `2px solid ${v.eqBorder}`, transition: 'border-color .6s', padding: '2px 14px', margin: '5px 0', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '24px' }}>
                          (4 × 30 min)
                        </span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', letterSpacing: '2px', color: 'var(--text-emph)', opacity: v.eqLabelOp, transition: 'opacity .6s' }}>
                        LABOR HOURS
                      </span>
                    </span>
                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                      = 7 / labor-hour
                    </span>
                  </div>
                  <div style={{ opacity: v.wOp, transition: 'opacity .8s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ position: 'relative', whiteSpace: 'nowrap' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '44px', fontWeight: '600', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                        {v.wage26}
                      </div>
                      <div style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '16px', fontFamily: 'var(--font-mono)', fontSize: '25px', color: 'var(--text-emph-2)', opacity: v.mOp, transition: 'opacity .8s', whiteSpace: 'nowrap', lineHeight: '1.3' }}>
                        = factory wage,
                        <br />
                        matched to keep them
                      </div>
                    </div>
                    <div style={{ fontSize: '24px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      real wage per musician (illustrative)
                    </div>
                  </div>
                </div>
                <div style={{ width: '210px', position: 'absolute', right: '16px', top: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', opacity: v.fOp, transition: 'opacity .9s' }}>
                  <svg viewBox="0 0 300 200" style={{ width: '200px' }}>
                    <path d="M30 190 h240 v-85 h-240 z" fill="var(--deck-figure-alt)">
                    </path>
                    <path d="M30 105 l48 -38 v38 l48 -38 v38 l48 -38 v38 l48 -38 v38 z" fill="var(--deck-figure-alt)">
                    </path>
                    <rect x="230" y="30" width="22" height="60" fill="var(--deck-figure-alt)">
                    </rect>
                    <rect x="52" y="128" width="34" height="40" fill="var(--deck-figure-alt-inset)">
                    </rect>
                    <rect x="112" y="128" width="34" height="40" fill="var(--deck-figure-alt-inset)">
                    </rect>
                    <rect x="172" y="128" width="34" height="40" fill="var(--deck-figure-alt-inset)">
                    </rect>
                    <line x1="20" y1="80" x2="110" y2="14" stroke="var(--shamrockGreen)" strokeWidth="7">
                    </line>
                    <path d="M118 8 L96 2 L104 24 z" fill="var(--shamrockGreen)">
                    </path>
                  </svg>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--shamrockGreen)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    productivity ↑↑
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    $45 / hr
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '66px' }}>
                    <span style={{ opacity: v.q1, transition: 'opacity .9s' }}>
                      <svg viewBox="0 0 90 130" style={{ width: '44px' }}>
                        <circle cx="45" cy="24" r="15" fill="var(--ink)">
                        </circle>
                        <path d="M28 42 h34 v66 h-34 z" fill="var(--ink)">
                        </path>
                        <ellipse cx="72" cy="72" rx="10" ry="17" fill="var(--gold)" transform="rotate(-50 72 72)">
                        </ellipse>
                      </svg>
                    </span>
                    <span style={{ opacity: v.q2, transition: 'opacity .9s' }}>
                      <svg viewBox="0 0 90 130" style={{ width: '44px' }}>
                        <circle cx="45" cy="24" r="15" fill="var(--ink)">
                        </circle>
                        <path d="M28 42 h34 v66 h-34 z" fill="var(--ink)">
                        </path>
                        <ellipse cx="72" cy="72" rx="10" ry="17" fill="var(--gold)" transform="rotate(-50 72 72)">
                        </ellipse>
                      </svg>
                    </span>
                    <span style={{ opacity: v.q3, transition: 'opacity .9s' }}>
                      <svg viewBox="0 0 90 130" style={{ width: '44px' }}>
                        <circle cx="45" cy="24" r="15" fill="var(--ink)">
                        </circle>
                        <path d="M28 42 h34 v66 h-34 z" fill="var(--ink)">
                        </path>
                        <ellipse cx="72" cy="72" rx="10" ry="17" fill="var(--gold)" transform="rotate(-50 72 72)">
                        </ellipse>
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', background: 'var(--ink)', color: 'var(--bg)', padding: '22px 34px', opacity: v.takeOp, transition: 'opacity .9s', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '30px', lineHeight: '1.4' }}>
                  The quartet’s pay is not set by what it produces — it is set by what these four could earn elsewhere, and elsewhere got dramatically more productive.
                </span>
                <span style={{ fontSize: '26px', lineHeight: '1.4', color: 'var(--deck-accent-on-ink)' }}>
                  Output per hour is unchanged, so the higher wage can only be covered by a higher ticket price.
                </span>
              </div>
            </div>
          </div>
          <HoverButton onClick={v.adv2} title="Advance build" style={{ position: 'absolute', right: '100px', bottom: '26px', fontFamily: 'var(--font-mono)', fontSize: '30px', lineHeight: '1', padding: '10px 18px', border: '1px solid var(--ink)', background: 'var(--gold)', color: 'var(--ink)', cursor: 'pointer', borderRadius: '0' }} hoverStyle={{ background: 'var(--ink)', color: 'var(--bg)' }}>
            {v.s2label}
          </HoverButton>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '8px', background: 'var(--deck-rail)' }}>
            <div style={{ width: '43%', height: '100%', background: 'var(--deck-rail-fill)' }}>
            </div>
          </div>
        </section>
      ),
    },
    {
      label: "The Cost Disease",
      screenLabel: "Baumol's Cost Disease",
      notes:
        "Scale the quartet up. Same figure shown three times, the pie grows because the whole economy grows. 1929: health 3.5% of GDP, $343 of $9,800 per capita. 2024: 18%, ~$12,460 of $69,200. Consolation: non-health spending per capita still grew ~6x, because the economy grew 7.1x. Third pie is a question, not a forecast: if the trend holds, 2124 is 59.4% health, and non-health grows only 2.7x over the century \u2014 the consolation weakens. Caveat button: measurement problems in healthcare output.",
      content: (
        <section style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', padding: '80px 100px 100px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: '60px', margin: '0', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: '0' }}>
              Baumol’s Cost Disease
            </h2>
            <HoverButton onClick={v.goB} style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', padding: '10px 22px', border: '1px solid var(--ink)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '0' }} hoverStyle={{ background: 'var(--ink)', color: 'var(--bg)' }}>
              Hospital productivity ›
            </HoverButton>
          </div>
          <div style={{ fontSize: '33px', lineHeight: '1.45', maxWidth: '1620px', marginTop: '26px', borderLeft: '4px solid var(--text-emph)', paddingLeft: '28px' }}>
            <span>
              Wages in labor-intensive, low-productivity sectors track wages in high-productivity sectors — so the prices of those services rise persistently over time.
            </span>
          </div>
          <div style={{ flex: '1', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '130px', paddingBottom: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', opacity: v.p1, transition: 'opacity .4s' }}>
              <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'conic-gradient(var(--atlOrange600) 0 3.5%, var(--atlBlue200) 3.5% 100%)', transform: `scale(${v.p1})`, transformOrigin: 'center bottom', transition: 'transform .5s cubic-bezier(.2,.8,.2,1)' }}>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '38px', fontWeight: '600' }}>
                1929
              </div>
              <div style={{ fontSize: '25px', lineHeight: '1.5', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div>
                  GDP / capita
                  {' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    $9,800
                  </span>
                </div>
                <div>
                  health
                  {' '}
                  <span style={{ color: 'var(--atlOrange600)', fontWeight: '600' }}>
                    3.5% · $343
                  </span>
                </div>
                <div>
                  non-health $9,460
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', opacity: v.p2, transition: 'opacity .4s' }}>
              <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: 'conic-gradient(var(--atlOrange600) 0 18%, var(--atlBlue200) 18% 100%)', transform: `scale(${v.p2})`, transformOrigin: 'center bottom', transition: 'transform .5s cubic-bezier(.2,.8,.2,1)' }}>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '38px', fontWeight: '600' }}>
                2024
              </div>
              <div style={{ fontSize: '25px', lineHeight: '1.5', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div>
                  GDP / capita
                  {' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    $69,200
                  </span>
                </div>
                <div>
                  health
                  {' '}
                  <span style={{ color: 'var(--atlOrange600)', fontWeight: '600' }}>
                    18% · $12,460
                  </span>
                </div>
                <div>
                  non-health $56,700
                  {' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--shamrockGreen)' }}>
                    ×6.0
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', opacity: v.p3, transition: 'opacity .4s' }}>
              <div style={{ width: '424px', height: '424px', borderRadius: '50%', background: 'conic-gradient(var(--atlOrange600) 0 59.4%, var(--atlBlue200) 59.4% 100%)', outline: '3px dashed var(--atlOrange600)', outlineOffset: '8px', transform: `scale(${v.p3})`, transformOrigin: 'center bottom', transition: 'transform .5s cubic-bezier(.2,.8,.2,1)' }}>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '38px', fontWeight: '600' }}>
                2124
              </div>
              <div style={{ fontSize: '25px', lineHeight: '1.5', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div>
                  GDP / capita
                  {' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    $381,600
                  </span>
                </div>
                <div>
                  health
                  {' '}
                  <span style={{ color: 'var(--atlOrange600)', fontWeight: '600' }}>
                    59.4% · $226,500
                  </span>
                </div>
                <div>
                  non-health $155,100
                  {' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--shamrockGreen)' }}>
                    ×2.7
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '36px', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '24px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '20px', height: '20px', background: 'var(--atlOrange600)', display: 'inline-block' }}>
              </span>
              <span>
                health care
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '20px', height: '20px', background: 'var(--atlBlue200)', display: 'inline-block' }}>
              </span>
              <span>
                everything else
              </span>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              real $ per capita · pie area ∝ real GDP per capita
            </span>
          </div>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '8px', background: 'var(--deck-rail)' }}>
            <div style={{ width: '57%', height: '100%', background: 'var(--deck-rail-fill)' }}>
            </div>
          </div>
        </section>
      ),
    },
    {
      label: "Outcomes",
      screenLabel: "Outcomes of the Cost Disease",
      notes:
        "Five canonical outcomes in the literature \u2014 move through quickly. 1: cost and price disease, stagnant-service prices rise persistently. 2: stagnating real output per hour in those sectors. 3: unbalanced growth across sectors. 4: employment and hours drift toward the stagnant sector. 5: aggregate productivity growth slows as the labor mix shifts. All well documented \u2014 and none of them answers the monetary-policy question. That gap is the next slide.",
      content: (
        <section style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', padding: '80px 100px 100px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '60px', margin: '0', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: '0' }}>
            Outcomes of the Cost Disease
          </h2>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '30px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '27px', color: 'var(--text-emph)' }}>
                01
              </span>
              <span style={{ fontSize: '38px', fontWeight: '600', width: '560px', flexShrink: '0' }}>
                Cost & price disease
              </span>
              <span style={{ fontSize: '29px', color: 'var(--text-secondary)' }}>
                relative prices of stagnant services rise persistently
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '30px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '27px', color: 'var(--text-emph)' }}>
                02
              </span>
              <span style={{ fontSize: '38px', fontWeight: '600', width: '560px', flexShrink: '0' }}>
                Stagnating real output
              </span>
              <span style={{ fontSize: '29px', color: 'var(--text-secondary)' }}>
                output per hour in the stagnant sector barely moves
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '30px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '27px', color: 'var(--text-emph)' }}>
                03
              </span>
              <span style={{ fontSize: '38px', fontWeight: '600', width: '560px', flexShrink: '0' }}>
                Unbalanced growth
              </span>
              <span style={{ fontSize: '29px', color: 'var(--text-secondary)' }}>
                sectors grow at persistently different rates as spending shifts
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '30px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '27px', color: 'var(--text-emph)' }}>
                04
              </span>
              <span style={{ fontSize: '38px', fontWeight: '600', width: '560px', flexShrink: '0' }}>
                Employment & hours
              </span>
              <span style={{ fontSize: '29px', color: 'var(--text-secondary)' }}>
                labor migrates toward the stagnant sector to keep supplying it
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '30px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '27px', color: 'var(--text-emph)' }}>
                05
              </span>
              <span style={{ fontSize: '38px', fontWeight: '600', width: '560px', flexShrink: '0' }}>
                Aggregate productivity
              </span>
              <span style={{ fontSize: '29px', color: 'var(--text-secondary)' }}>
                economy-wide growth slows as the labor mix tilts stagnant
              </span>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '27px', color: 'var(--text-emph-2)' }}>
            All well documented — and none of them answers the monetary-policy question.
          </div>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '8px', background: 'var(--deck-rail)' }}>
            <div style={{ width: '71%', height: '100%', background: 'var(--deck-rail-fill)' }}>
            </div>
          </div>
        </section>
      ),
    },
    {
      label: "The Open Question",
      screenLabel: "Monetary Policy on Biased Expectations",
      notes:
        "The wrap-up research slide. Willis & Cao (2015) ask whether monetary policy has lost its effectiveness. A Baumol route to an answer: managers have imperfect knowledge of productivity change in their own sector, so they set wages on EXPECTED productivity. When they overestimate, they impose cost disease on other sectors with no realized growth behind it. Baslandze et al. (2026), Fig. 6: firms' reported AI productivity effects run well above what their behavior implies, in every sector \u2014 over-inflated expectations are being set right now. The resulting unit-labor-cost and price rise LOOKS like demand pressure to a central bank, which tightens \u2014 but it is expectational misalignment, not demand. Whether this dulls or sharpens policy depends on substitutability vs complementarity of goods across sectors. That is what I am studying. Keep off-slide: Acemoglu 2002 directed technical change \u2014 innovation direction responds to factor prices; and the innovation-investment angle: expected productivity is partly a choice variable through R&D.",
      content: (
        <section style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', padding: '70px 100px 100px', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '52px', margin: '0', fontWeight: '600', lineHeight: '1.2', flexShrink: '0', maxWidth: '1700px' }}>
            What happens when monetary policy is set on wages anchored to biased
            {' '}
            <span style={{ fontStyle: 'italic' }}>
              expected
            </span>
            {' '}
            productivity?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', flex: '1', minHeight: '0', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: '0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', fontSize: '28px', lineHeight: '1.45' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-emph)' }}>
                  ▪
                </span>
                <span>
                  The economy has become less responsive to monetary policy since 1984 (Willis & Cao 2015).
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', fontSize: '28px', lineHeight: '1.45' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-emph)' }}>
                  ▪
                </span>
                <span>
                  Recent productivity shocks (the IT revolution, AI) have drawn expectations well above realized productivity.
                </span>
              </div>
              <div style={{ fontSize: '30px', fontWeight: '600' }}>
                Is there a link between the two? One proposal:
              </div>
              <svg viewBox="0 0 1400 440" style={{ width: '100%' }}>
                <line x1="80" y1="390" x2="1350" y2="390" stroke="var(--ink)" strokeWidth="3">
                </line>
                <line x1="80" y1="30" x2="80" y2="390" stroke="var(--ink)" strokeWidth="3">
                </line>
                <text x="1350" y="428" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  time
                </text>
                <text x="46" y="210" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)" textAnchor="middle" transform="rotate(-90 46 210)">
                  productivity
                </text>
                <line x1="80" y1="370" x2="1220" y2="80" stroke="var(--ink)" strokeWidth="5" strokeDasharray="16 13">
                </line>
                <path d="M80 370 Q650 330 1220 225" stroke="var(--Res-blue1)" strokeWidth="6" fill="none">
                </path>
                <text x="820" y="100" fontSize="27" fill="var(--ink)" fontFamily="var(--font-mono)">
                  expected path
                </text>
                <text x="880" y="330" fontSize="27" fill="var(--Res-blue1)" fontFamily="var(--font-mono)">
                  realized path
                </text>
                <line x1="1220" y1="95" x2="1220" y2="210" stroke="var(--respectRed)" strokeWidth="4" strokeDasharray="7 7">
                </line>
                <text x="1240" y="230" fontSize="26" fill="var(--respectRed)" fontFamily="var(--font-mono)">
                  shortfall
                </text>
                <circle cx="1220" cy="80" r="11" fill="var(--atlOrange600)">
                </circle>
                <rect x="1246" y="46" width="132" height="52" fill="var(--atlOrange600)">
                </rect>
                <text x="1312" y="80" textAnchor="middle" fontSize="26" fill="var(--bg)" fontFamily="var(--font-mono)" fontWeight="600">
                  wage set
                </text>
                <text x="1050" y="52" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                  wage anchored to the expectation, not the outcome
                </text>
              </svg>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontFamily: 'var(--font-mono)', fontSize: '24px', border: '1px solid var(--ink)', padding: '14px 18px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <span>
                  unit labor costs ↑
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  ⇒
                </span>
                <span>
                  prices ↑
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  ⇒
                </span>
                <span>
                  read as demand pressure
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  ⇒
                </span>
                <span style={{ color: 'var(--respectRed)', fontWeight: '600' }}>
                  policy tightens
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0', alignItems: 'center' }}>
              <img src="/images/decks/baumol_ai-productivity-expectations.png" alt="Reported versus implied AI productivity effects by sector, Baslandze et al. (2026), Figure 6" style={{ maxWidth: '100%', maxHeight: '440px', border: '1px solid var(--ink)', background: 'white', padding: '10px', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '25px', lineHeight: '1.45', color: 'var(--text-secondary)' }}>
                Firms report far larger productivity effects of AI than their behavior implies — over-optimistic expectations are being baked into wages right now.
              </div>
            </div>
          </div>
          <div style={{ fontSize: '36px', lineHeight: '1.4', fontWeight: '600', color: 'var(--text-emph)', maxWidth: '1750px' }}>
            In a model with Baumol’s cost disease, monetary policy’s ineffectiveness could be tied to the gap between expected and realized productivity growth.
          </div>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '8px', background: 'var(--deck-rail)' }}>
            <div style={{ width: '86%', height: '100%', background: 'var(--deck-rail-fill)' }}>
            </div>
          </div>
        </section>
      ),
    },
    {
      label: "Closing",
      notes:
        "Hold through Q&A. Appendix slides are behind the buttons on the quartet and cost-disease slides if challenged.",
      content: (
        <section style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', padding: '100px 110px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: '1', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: '96px', lineHeight: '1.2', fontWeight: '600' }}>
              Thank you
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'var(--font-mono)', fontSize: '28px', borderTop: '1px solid var(--bg)', paddingTop: '28px' }}>
            <span>
              Michael Dwight Sparks
            </span>
            <span style={{ opacity: '.7' }}>
              Baumol’s Disease and Monetary Policy
            </span>
          </div>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '8px', background: 'var(--atlBlue900)' }}>
            <div style={{ width: '100%', height: '100%', background: 'var(--primaryBlue)' }}>
            </div>
          </div>
        </section>
      ),
    },
    {
      label: "Appendix A",
      screenLabel: "Appendix: Compensation vs Productivity",
      notes:
        "Q&A defense of 'wages track productivity'. Deflated consistently (producer prices) and taken as an average, hourly compensation tracks net productivity almost one-for-one through 2014. The famous 'gap' chart uses MEDIAN compensation with a consumer deflator \u2014 toggle it on: that series mixes distributional change and deflator wedges into what is really a tight productivity-compensation link at the level the theory operates on.",
      content: (
        <section style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', padding: '70px 100px 90px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: '46px', margin: '0', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: '0' }}>
              Compensation vs. Productivity, 1973–2014
            </h2>
            <HoverButton onClick={v.back1} style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', padding: '10px 22px', border: '1px solid var(--ink)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '0' }} hoverStyle={{ background: 'var(--ink)', color: 'var(--bg)' }}>
              ‹ back to the quartet
            </HoverButton>
          </div>
          <div style={{ fontSize: '29px', color: 'var(--text-secondary)', maxWidth: '1600px' }}>
            Deflated consistently, average hourly compensation tracks net productivity almost one-for-one.
          </div>
          <svg viewBox="0 0 1500 650" style={{ width: '100%', flex: '1', minHeight: '0' }}>
            <line x1="120" y1="548" x2="1420" y2="548" stroke="var(--Res-gray1)" strokeOpacity="0.4" strokeWidth="2">
            </line>
            <line x1="120" y1="421" x2="1420" y2="421" stroke="var(--Res-gray1)" strokeOpacity="0.4" strokeWidth="2">
            </line>
            <line x1="120" y1="294" x2="1420" y2="294" stroke="var(--Res-gray1)" strokeOpacity="0.4" strokeWidth="2">
            </line>
            <line x1="120" y1="167" x2="1420" y2="167" stroke="var(--Res-gray1)" strokeOpacity="0.4" strokeWidth="2">
            </line>
            <line x1="120" y1="40" x2="1420" y2="40" stroke="var(--Res-gray1)" strokeOpacity="0.4" strokeWidth="2">
            </line>
            <text x="105" y="556" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              0%
            </text>
            <text x="105" y="429" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              20%
            </text>
            <text x="105" y="302" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              40%
            </text>
            <text x="105" y="175" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              60%
            </text>
            <text x="105" y="48" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              80%
            </text>
            <text x="120" y="600" textAnchor="middle" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              1973
            </text>
            <text x="437" y="600" textAnchor="middle" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              1983
            </text>
            <text x="754" y="600" textAnchor="middle" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              1993
            </text>
            <text x="1071" y="600" textAnchor="middle" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              2003
            </text>
            <text x="1420" y="600" textAnchor="middle" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              2014
            </text>
            <polyline points={v.netPts} fill="none" stroke="var(--Res-blue1)" strokeWidth="5">
            </polyline>
            <polyline points={v.prodPts} fill="none" stroke="var(--Res-orange1)" strokeWidth="5">
            </polyline>
            <polyline points={v.medPts} fill="none" stroke="var(--Res-green1)" strokeWidth="4" style={{ opacity: v.medOp, transition: 'opacity .6s' }}>
            </polyline>
          </svg>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '25px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '34px', height: '6px', background: 'var(--Res-blue1)', display: 'inline-block' }}>
              </span>
              <span>
                net productivity
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '34px', height: '6px', background: 'var(--Res-orange1)', display: 'inline-block' }}>
              </span>
              <span>
                real producer avg hourly compensation
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', opacity: v.medOp, transition: 'opacity .6s' }}>
              <span style={{ width: '34px', height: '6px', background: 'var(--Res-green1)', display: 'inline-block' }}>
              </span>
              <span>
                real median hourly compensation
              </span>
            </span>
            <HoverButton onClick={v.toggleMed} style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', padding: '8px 20px', border: '1px solid var(--ink)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '0', marginLeft: 'auto' }} hoverStyle={{ background: 'var(--ink)', color: 'var(--bg)' }}>
              {v.medLabel}
            </HoverButton>
          </div>
          <div style={{ fontSize: '24px', color: 'var(--text-secondary)' }}>
            Cumulative % change since 1973. The often-cited median series mixes distributional and deflator effects into the comparison — it disguises the mechanics, it does not refute them.
          </div>
          <div style={{ position: 'absolute', right: '100px', bottom: '20px', fontFamily: 'var(--font-mono)', fontSize: '24px', letterSpacing: '3px', color: 'var(--atlOrange600)' }}>
            APPENDIX
          </div>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '8px', background: 'var(--atlOrange600)' }}>
          </div>
        </section>
      ),
    },
    {
      label: "Appendix B",
      screenLabel: "Appendix: Hospital Productivity",
      notes:
        "Hospitals, 1993-2022. Sectoral output rises ~52% and hours worked rise ~50% \u2014 but labor productivity flatlines: it drifts up to ~117 by 2001 and ends 2022 at 101.6, essentially where it started thirty years earlier. Output growth in hospitals is coming almost entirely from more hours, not more output per hour. This is the cost-disease mechanism in the data.",
      content: (
        <section style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', padding: '70px 100px 90px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: '46px', margin: '0', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: '0' }}>
              Hospital Productivity, 1993–2022
            </h2>
            <HoverButton onClick={v.back2} style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', padding: '10px 22px', border: '1px solid var(--ink)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '0' }} hoverStyle={{ background: 'var(--ink)', color: 'var(--bg)' }}>
              ‹ back to the cost disease
            </HoverButton>
          </div>
          <div style={{ fontSize: '29px', color: 'var(--text-secondary)', maxWidth: '1600px' }}>
            Output grows, hours grow with it — and output per hour goes nowhere.
          </div>
          <svg viewBox="0 0 1500 650" style={{ width: '100%', flex: '1', minHeight: '0' }}>
            <line x1="120" y1="541" x2="1420" y2="541" stroke="var(--Res-gray1)" strokeOpacity="0.4" strokeWidth="2">
            </line>
            <line x1="120" y1="387" x2="1420" y2="387" stroke="var(--Res-gray1)" strokeOpacity="0.4" strokeWidth="2">
            </line>
            <line x1="120" y1="233" x2="1420" y2="233" stroke="var(--Res-gray1)" strokeOpacity="0.4" strokeWidth="2">
            </line>
            <line x1="120" y1="79" x2="1420" y2="79" stroke="var(--Res-gray1)" strokeOpacity="0.4" strokeWidth="2">
            </line>
            <text x="105" y="549" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              100
            </text>
            <text x="105" y="395" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              120
            </text>
            <text x="105" y="241" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              140
            </text>
            <text x="105" y="87" textAnchor="end" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              160
            </text>
            <text x="120" y="600" textAnchor="middle" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              1993
            </text>
            <text x="434" y="600" textAnchor="middle" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              2000
            </text>
            <text x="882" y="600" textAnchor="middle" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              2010
            </text>
            <text x="1420" y="600" textAnchor="middle" fontSize="24" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
              2022
            </text>
            <polyline points={v.hospOut} fill="none" stroke="var(--Res-green1)" strokeWidth="5">
            </polyline>
            <polyline points={v.hospHrs} fill="none" stroke="var(--Res-orange1)" strokeWidth="5">
            </polyline>
            <polyline points={v.hospProd} fill="none" stroke="var(--Res-blue1)" strokeWidth="7">
            </polyline>
          </svg>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '25px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '34px', height: '7px', background: 'var(--Res-blue1)', display: 'inline-block' }}>
              </span>
              <span style={{ fontWeight: '600' }}>
                labor productivity
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '34px', height: '5px', background: 'var(--Res-orange1)', display: 'inline-block' }}>
              </span>
              <span>
                hours worked
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '34px', height: '5px', background: 'var(--Res-green1)', display: 'inline-block' }}>
              </span>
              <span>
                sectoral output
              </span>
            </span>
            <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>
              index, 1993 = 100 · hospitals
            </span>
          </div>
          <div style={{ fontSize: '24px', color: 'var(--text-secondary)' }}>
            Thirty years of output growth in hospitals is almost entirely more hours — output per hour ends where it began.
          </div>
          <div style={{ position: 'absolute', right: '100px', bottom: '20px', fontFamily: 'var(--font-mono)', fontSize: '24px', letterSpacing: '3px', color: 'var(--atlOrange600)' }}>
            APPENDIX
          </div>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '8px', background: 'var(--atlOrange600)' }}>
          </div>
        </section>
      ),
    },
  ]

  return (
    <DeckStage
      slides={slides}
      index={index}
      onIndexChange={setIndex}
      onAdvance={handleAdvance}
      width={CANVAS_W}
      height={CANVAS_H}
      label="Baumol's Disease and Monetary Policy"
    />
  )
}
