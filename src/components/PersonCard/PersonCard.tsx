import { Link } from 'react-router-dom'
import type { Person } from '@/data/people'
import styles from './PersonCard.module.css'

export interface PersonCardProps {
  person: Person
}

/**
 * People-index card. Shows the person's drawing, index name, and affiliation;
 * the whole card links to the person profile route. Ported from the
 * `.people-card*` markup emitted by renderPeopleIndex() in 0_app.js.
 */
export function PersonCard({ person }: PersonCardProps) {
  const name = person.indexName || person.name
  const alt = person.altDrawing ?? `${name || 'Person'} Drawing`

  return (
    <Link to={`/person/${person.slug}`} className={styles.card}>
      {person.drawingImage && (
        <img src={person.drawingImage} alt={alt} className={styles.image} />
      )}
      <div className={styles.info}>
        <div className={styles.name}>{name}</div>
        <div className={styles.affiliation}>{person.institution}</div>
      </div>
    </Link>
  )
}
