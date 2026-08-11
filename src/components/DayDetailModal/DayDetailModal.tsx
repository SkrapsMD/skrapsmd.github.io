import { useEffect } from 'react'
import type { ReactNode } from 'react'
import styles from './DayDetailModal.module.css'

export interface DayDetailModalProps {
  /** Whether the modal is shown. */
  open: boolean
  /** Heading shown above the body (the date label). */
  title: string
  /** Close handler — fires on Escape, overlay click, and the close button. */
  onClose: () => void
  /** The day's detail rows, rendered by the Calendar page. */
  children: ReactNode
}

/**
 * Controlled day-detail modal for the Calendar page. Below the mobile
 * breakpoint the sticky detail panel would eat most of the viewport, so the
 * same content is presented here instead. Structure follows StoryModal.
 */
export function DayDetailModal({ open, title, onClose, children }: DayDetailModalProps) {
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

  if (!open) return null

  return (
    <div className={`${styles.modal} ${styles.open}`}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.content} role="dialog" aria-modal="true" aria-label={title}>
        <button className={styles.close} aria-label="Close modal" onClick={onClose}>
          &times;
        </button>
        <div className={styles.title}>{title}</div>
        {children}
      </div>
    </div>
  )
}
