import { Link } from 'react-router-dom'
import { presentationsByDate } from '@/data/presentations'
import { Badge } from '@/ui'
import styles from './Presentations.module.css'

export default function Presentations() {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Talks &amp; Presentations</h2>

      {presentationsByDate.map((talk) => (
        <article key={talk.slug} className={styles.card}>
          <h3 className={styles.title}>
            <Link to={`/presentations/${talk.slug}`} className={styles.titleLink}>
              {talk.title}
            </Link>
          </h3>

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
            <span aria-hidden="true">·</span>
            <span>{talk.slideCount} slides</span>
          </div>

          <p className={styles.summary}>{talk.summary}</p>

          <div className={styles.footer}>
            <div className={styles.badges}>
              {talk.badges.map((badge) => (
                <Badge key={badge}>{badge}</Badge>
              ))}
            </div>
            <Link to={`/presentations/${talk.slug}`} className={styles.open}>
              Open deck →
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
