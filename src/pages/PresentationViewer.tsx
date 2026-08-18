import type { ComponentType } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { findPresentation } from '@/data/presentations'
import BaumolCostDiseaseDeck from '@/decks/BaumolCostDisease'
import { Badge } from '@/ui'
import styles from './PresentationViewer.module.css'

// Decks are React components, so they live here rather than in the data file.
const DECKS: Record<string, ComponentType> = {
  'baumol-monetary-policy': BaumolCostDiseaseDeck,
}

export default function PresentationViewer() {
  const { slug } = useParams()
  const talk = findPresentation(slug)
  const Deck = slug ? DECKS[slug] : undefined

  if (!talk || !Deck) return <Navigate to="/presentations" replace />

  return (
    <section className={styles.page}>
      <div className={styles.head}>
        <Link to="/presentations" className={styles.back}>
          ‹ All presentations
        </Link>
        <h2 className={styles.title}>{talk.title}</h2>
        <div className={styles.meta}>
          <span>{talk.event}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={talk.isoDate}>{talk.date}</time>
          {talk.location && (
            <>
              <span aria-hidden="true">·</span>
              <span>{talk.location}</span>
            </>
          )}
        </div>
      </div>

      <Deck />

      <p className={styles.hint}>
        Click the right half of a slide (or press <kbd>→</kbd>) to advance, the left half
        (<kbd>←</kbd>) to go back. <kbd>F</kbd> presents full screen, <kbd>N</kbd> shows
        speaker notes, <kbd>R</kbd> returns to the first slide.
      </p>

      <div className={styles.badges}>
        {talk.badges.map((badge) => (
          <Badge key={badge}>{badge}</Badge>
        ))}
      </div>
    </section>
  )
}
