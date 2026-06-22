import { people } from '@/data/people'
import type { Person } from '@/data/people'
import { PersonCard } from '@/components/PersonCard/PersonCard'
import { TableCaption } from '@/ui'
import styles from './People.module.css'

// Institutions folded into the "Christopher Newport University" bundle; every
// other institution falls into the "Federal Reserve Bank of Atlanta" bundle.
// Mirrors the cnuBundleInstitutions set in renderPeopleIndex() (0_app.js).
const CNU_BUNDLE = new Set(['Christopher Newport University', 'George Mason University'])

const FRBA_BUNDLE = 'Federal Reserve Bank of Atlanta'
const CNU_BUNDLE_LABEL = 'Christopher Newport University'

// Last-name sort key: drop a comma, take the final whitespace token, lowercase.
// Replicates getLastNameSortKey() in renderPeopleIndex().
function lastNameSortKey(person: Person): string {
  const fullName = (person.name || person.indexName || '').trim()
  if (!fullName) return ''
  const tokens = fullName.replace(',', '').split(/\s+/).filter(Boolean)
  return (tokens[tokens.length - 1] || fullName).toLowerCase()
}

// Build the two ordered, sorted bundles (FRBA first, then CNU). Within each
// bundle: sort by last name, breaking ties on the full name.
function buildSections(): [string, Person[]][] {
  const grouped = new Map<string, Person[]>([
    [FRBA_BUNDLE, []],
    [CNU_BUNDLE_LABEL, []],
  ])

  for (const person of people) {
    const bundle = CNU_BUNDLE.has(person.institution) ? CNU_BUNDLE_LABEL : FRBA_BUNDLE
    grouped.get(bundle)!.push(person)
  }

  const sections: [string, Person[]][] = []
  for (const [institution, members] of grouped) {
    if (members.length === 0) continue
    const sorted = [...members].sort((a, b) => {
      const keyA = lastNameSortKey(a)
      const keyB = lastNameSortKey(b)
      if (keyA === keyB) {
        const nameA = (a.name || a.indexName || '').toLowerCase()
        const nameB = (b.name || b.indexName || '').toLowerCase()
        return nameA.localeCompare(nameB)
      }
      return keyA.localeCompare(keyB)
    })
    sections.push([institution, sorted])
  }
  return sections
}

export default function People() {
  const sections = buildSections()

  return (
    <>
      {sections.map(([institution, members]) => (
        <section key={institution}>
          <TableCaption category="PEOPLE INDEX |" title={institution} size="lg" />
          <div className={styles.grid}>
            {members.map((person) => (
              <PersonCard key={person.slug} person={person} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
