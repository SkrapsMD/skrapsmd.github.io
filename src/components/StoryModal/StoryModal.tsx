import { useEffect, useState } from 'react'
import type { StoryFigure } from '@/data/storyGroups'
import { Button } from '@/ui'
import styles from './StoryModal.module.css'

export interface StoryModalProps {
  /** Whether the modal is shown. */
  open: boolean
  /** Heading shown above the embed (the paper title). */
  title?: string
  /** One figure for a single story, many for a grouped story. */
  figures: StoryFigure[]
  /** Close handler — fires on Escape, overlay click, and the close button. */
  onClose: () => void
}

// Sandbox flags ported verbatim from createStoryIframe() in 0_app.js.
const IFRAME_SANDBOX =
  'allow-same-origin allow-forms allow-scripts allow-downloads allow-popups ' +
  'allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation'

// Mirrors buildStoryEmbedUrl(): pass full URLs through, expand legacy short
// Flourish paths like "story/12345?" into a full embed URL.
function buildStoryEmbedUrl(src: string): string {
  if (!src) return ''
  if (/^https?:\/\//i.test(src)) return src
  const basePath = src.split('?')[0]
  return 'https://flo.uri.sh/' + basePath + '/embed'
}

/**
 * Controlled Flourish data-story modal. A single story is a one-element
 * `figures` array; multiple figures add a Prev/Next selector with an indicator.
 * Reused on the Research page and (later) on person-profile pages.
 */
export function StoryModal({ open, title, figures, onClose }: StoryModalProps) {
  const [index, setIndex] = useState(0)

  // Reset to the first figure whenever the modal is (re)opened.
  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open || figures.length === 0) return null

  const total = figures.length
  const safeIndex = Math.min(index, total - 1)
  const current = figures[safeIndex]
  const figureLabel = current.label ? ' - ' + current.label : ''

  return (
    <div className={`${styles.modal} ${styles.open}`}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.content} role="dialog" aria-modal="true">
        <button className={styles.close} aria-label="Close modal" onClick={onClose}>
          &times;
        </button>
        <div className={styles.title}>{(title ?? '') + figureLabel}</div>
        <div className={styles.embedContainer}>
          {total > 1 && (
            <div className={styles.nav}>
              <Button
                variant="ghost"
                disabled={safeIndex === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                Previous
              </Button>
              <div className={styles.navIndicator}>
                {(current.label || 'Figure ' + (safeIndex + 1)) +
                  ' (' +
                  (safeIndex + 1) +
                  '/' +
                  total +
                  ')'}
              </div>
              <Button
                variant="ghost"
                disabled={safeIndex === total - 1}
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              >
                Next
              </Button>
            </div>
          )}
          <iframe
            key={current.src}
            src={buildStoryEmbedUrl(current.src)}
            title="Interactive or visual content"
            className={styles.iframe}
            frameBorder="0"
            scrolling="no"
            style={{ height: (current.height ?? 600) + 'px' }}
            sandbox={IFRAME_SANDBOX}
          />
        </div>
      </div>
    </div>
  )
}
