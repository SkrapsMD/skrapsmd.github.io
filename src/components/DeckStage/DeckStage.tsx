import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import styles from './DeckStage.module.css'

export interface DeckSlide {
  /** Short nav label, e.g. 'Title'. Unique within a deck. */
  label: string
  /** Heading shown in the stage overlay; defaults to `label`. */
  screenLabel?: string
  /** Speaker notes, shown under the stage when notes are toggled on. */
  notes?: string
  /** The slide body, authored against the deck's fixed design canvas. */
  content: ReactNode
}

export interface DeckStageProps {
  slides: DeckSlide[]
  /** Current slide (controlled by the deck, which also owns its build state). */
  index: number
  onIndexChange: (index: number) => void
  /**
   * Called before advancing off the current slide. Return `true` to swallow the
   * advance — decks use this to step through on-slide builds before moving on.
   */
  onAdvance?: () => boolean
  /** Design canvas the slides are authored against. */
  width?: number
  height?: number
  /** Accessible name for the stage region. */
  label: string
  className?: string
}

// The stage measures itself before paint; on the server there is nothing to
// measure, so fall back to the passive effect to keep renderToStaticMarkup quiet.
const useMeasureEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const OVERLAY_IDLE_MS = 2400

const isInteractive = (node: EventTarget | null): boolean => {
  let el = node instanceof Element ? node : null
  while (el) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'label') return true
    if (el.getAttribute('role') === 'button') return true
    el = el.parentElement
  }
  return false
}

export function DeckStage({
  slides,
  index,
  onIndexChange,
  onAdvance,
  width = 1920,
  height = 1080,
  label,
  className = '',
}: DeckStageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const count = slides.length
  const slide = slides[Math.min(Math.max(index, 0), count - 1)]

  const goTo = useCallback(
    (i: number) => onIndexChange(Math.max(0, Math.min(count - 1, i))),
    [count, onIndexChange],
  )
  const next = useCallback(() => {
    if (onAdvance?.()) return
    goTo(index + 1)
  }, [goTo, index, onAdvance])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  // Scale the fixed design canvas to fit whatever box the stage is given, so a
  // 1920x1080 slide reads the same inline at 950px as it does full-screen.
  useMeasureEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const fit = () => {
      const { width: fw, height: fh } = frame.getBoundingClientRect()
      if (fw > 0 && fh > 0) setScale(Math.min(fw / width, fh / height))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(frame)
    return () => ro.disconnect()
  }, [width, height])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    if (document.fullscreenElement === root) {
      void document.exitFullscreen()
    } else {
      void root.requestFullscreen?.().then(() => root.focus())
    }
  }, [])

  // The overlay is pointer-summoned: it appears on movement and fades on idle so
  // it never sits on top of a slide during a talk.
  const wakeOverlay = useCallback(() => {
    setOverlayVisible(true)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setOverlayVisible(false), OVERLAY_IDLE_MS)
  }, [])

  useEffect(() => {
    wakeOverlay()
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [wakeOverlay])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return

    const key = e.key
    // Space and Enter belong to whatever slide control has focus.
    if ((key === ' ' || key === 'Enter') && /^(BUTTON|A)$/.test(target?.tagName ?? '')) return
    let handled = true
    if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown' || key === ' ') next()
    else if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') prev()
    else if (key === 'Home') goTo(0)
    else if (key === 'End') goTo(count - 1)
    else if (key === 'r' || key === 'R') goTo(0)
    else if (key === 'f' || key === 'F') toggleFullscreen()
    else if (key === 'n' || key === 'N') setNotesOpen((open) => !open)
    else if (/^[1-9]$/.test(key)) goTo(Number(key) - 1)
    else handled = false

    if (handled) {
      e.preventDefault()
      e.stopPropagation()
      wakeOverlay()
    }
  }

  // Click the left half to go back, the right half to advance — but never when
  // the click landed on something a slide made clickable.
  const onCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isInteractive(e.target)) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientX - rect.left < rect.width / 2) prev()
    else next()
  }

  const focusStage = () => {
    const root = rootRef.current
    if (root && !root.contains(document.activeElement)) root.focus()
  }

  const canvasStyle = useMemo(
    () => ({
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(-50%, -50%) scale(${scale})`,
      visibility: (scale > 0 ? 'visible' : 'hidden') as 'visible' | 'hidden',
    }),
    [width, height, scale],
  )

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-roledescription="slide deck"
      aria-label={label}
      className={`${styles.root} ${fullscreen ? styles.fullscreen : ''} ${className}`.trim()}
      onKeyDown={onKeyDown}
      onMouseDown={focusStage}
      onMouseMove={wakeOverlay}
    >
      <div ref={frameRef} className={styles.frame} style={{ aspectRatio: `${width} / ${height}` }}>
        <div className={styles.canvas} style={canvasStyle} onClick={onCanvasClick}>
          {slide?.content}
        </div>

        <div
          className={`${styles.overlay} ${overlayVisible ? '' : styles.overlayIdle}`}
          onMouseEnter={() => {
            if (idleTimer.current) clearTimeout(idleTimer.current)
            setOverlayVisible(true)
          }}
          onMouseLeave={wakeOverlay}
        >
          <button
            type="button"
            className={styles.ctrl}
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <span className={styles.counter}>
            {index + 1} / {count}
          </span>
          <button
            type="button"
            className={styles.ctrl}
            onClick={next}
            aria-label="Next slide"
          >
            ›
          </button>
          <span className={styles.slideLabel}>{slide?.screenLabel ?? slide?.label}</span>
          <button
            type="button"
            className={styles.ctrl}
            onClick={() => setNotesOpen((open) => !open)}
            aria-pressed={notesOpen}
            title="Speaker notes (N)"
          >
            notes
          </button>
          <button
            type="button"
            className={styles.ctrl}
            onClick={toggleFullscreen}
            title="Present full screen (F)"
          >
            {fullscreen ? 'exit' : 'present'}
          </button>
        </div>
      </div>

      {notesOpen && (
        <div className={styles.notes}>
          <div className={styles.notesHead}>
            Speaker notes · {slide?.screenLabel ?? slide?.label}
          </div>
          <p className={styles.notesBody}>{slide?.notes ?? 'No notes for this slide.'}</p>
        </div>
      )}
    </div>
  )
}
