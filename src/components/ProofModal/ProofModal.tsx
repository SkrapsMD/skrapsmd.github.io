import { useEffect } from 'react'
import type { Proof } from '@/data/applications'
import styles from './ProofModal.module.css'

export interface ProofModalProps {
  /** Whether the modal is shown. */
  open: boolean
  /** The proof to display — an email's fields or a PDF url. */
  proof: Proof | null
  /** School name (used for the document-proof header on PDF proofs). */
  school?: string
  /** Close handler — fires on Escape, overlay click, and the close button. */
  onClose: () => void
}

/**
 * Controlled proof modal. Ported from setupProofModal() in 0_app.js:
 * email proofs show From / Date / Subject / Body (the body is rendered as HTML,
 * matching the original innerHTML behavior so inline links/<b> tags work); PDF
 * proofs show an iframe with the toolbar and nav panes suppressed. Closes on
 * Escape, overlay click, and the close button, and locks body scroll while open.
 */
export function ProofModal({ open, proof, school, onClose }: ProofModalProps) {
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

  if (!open || !proof) return null

  const isPdf = proof.kind === 'pdf'

  return (
    <div className={`${styles.modal} ${styles.open} ${isPdf ? styles.pdfMode : ''}`.trim()}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.content} role="dialog" aria-modal="true">
        <button className={styles.close} aria-label="Close modal" onClick={onClose}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 384 512"
            className={styles.closeIcon}
          >
            <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
          </svg>
        </button>

        {proof.kind === 'email' ? (
          <>
            <div className={`${styles.header} mono`}>
              <div className={styles.from}>From: {proof.from}</div>
              <div className={styles.date}>{proof.date}</div>
            </div>
            <div className={`${styles.subject} mono`}>Subject: {proof.subject}</div>
            <div
              className={`${styles.body} mono`}
              dangerouslySetInnerHTML={{ __html: proof.body }}
            />
          </>
        ) : (
          <>
            <div className={`${styles.header} mono`}>
              <div className={styles.from}>Document Proof</div>
              <div className={styles.date}>{school}</div>
            </div>
            <div className={`${styles.pdfContainer} ${styles.pdfContainerActive}`}>
              <iframe
                className={styles.pdfViewer}
                title="Proof document"
                src={proof.url + '#toolbar=0&navpanes=0'}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
