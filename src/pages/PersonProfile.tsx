import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { people } from '@/data/people'
import { research } from '@/data/research'
import type { StoryFigure } from '@/data/storyGroups'
import { ResearchCard } from '@/components/ResearchCard/ResearchCard'
import { StoryModal } from '@/components/StoryModal/StoryModal'
import { Table, TableCaption } from '@/ui'
import styles from './PersonProfile.module.css'

interface StoryState {
  open: boolean
  title: string
  figures: StoryFigure[]
}

export default function PersonProfile() {
  const { slug } = useParams<{ slug: string }>()
  const person = people.find((p) => p.slug === slug)

  // Hooks must run unconditionally — declare before the not-found short-circuit.
  const [showPhoto, setShowPhoto] = useState(false)
  const [story, setStory] = useState<StoryState>({
    open: false,
    title: '',
    figures: [],
  })

  const openStory = useCallback((figures: StoryFigure[], title: string) => {
    setStory({ open: true, title, figures })
  }, [])

  const closeStory = useCallback(() => {
    setStory((s) => ({ ...s, open: false }))
  }, [])

  if (!person) {
    return (
      <section>
        <p>Person not found.</p>
        <Link to="/people">Back to People</Link>
      </section>
    )
  }

  // Photo toggle: drawing by default, swap to the official photo (and alt) on
  // click. Mirrors setupPersonPhotoToggle() in 0_app.js.
  const drawingSrc = person.drawingImage
  const photoSrc = person.photoImage
  const canToggle = Boolean(drawingSrc && photoSrc)
  const showingPhoto = showPhoto && Boolean(photoSrc)
  const imageSrc = showingPhoto ? photoSrc : drawingSrc
  const imageAlt = showingPhoto
    ? (person.altPhoto ?? person.name)
    : (person.altDrawing ?? `${person.name} Drawing`)

  // Co-authored papers: papers where some author's slug matches this person.
  const papers = research.filter((paper) =>
    paper.authors.some((author) => author.slug === person.slug),
  )

  return (
    <>
      <section className={styles.header}>
        <div>
          <Table variant="compact" className={styles.profileTable}>
            <caption className={styles.tableCaption}>
              <TableCaption category="PEOPLE INDEX |" title={person.name} size="lg" />
            </caption>
            <tbody>
              <tr>
                <th scope="row">Institution</th>
                <td>{person.institution}</td>
              </tr>
              {person.phdInstitution && (
                <tr>
                  <th scope="row">PhD Institution</th>
                  <td>{person.phdInstitution}</td>
                </tr>
              )}
              <tr>
                <th scope="row">Email</th>
                <td>
                  {person.email ? (
                    <a href={`mailto:${person.email}`}>{person.email}</a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
              <tr>
                <th scope="row">Website</th>
                <td>
                  {person.website ? (
                    <a
                      href={person.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Personal Website
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
              <tr>
                <th scope="row">Last Updated</th>
                <td className="mono">{person.updated ?? '-'}</td>
              </tr>
            </tbody>
          </Table>
        </div>

        <div className={styles.photoCell}>
          {imageSrc && (
            <img
              src={imageSrc}
              alt={imageAlt}
              className={styles.photo}
              style={canToggle ? { cursor: 'pointer' } : undefined}
              onClick={canToggle ? () => setShowPhoto((v) => !v) : undefined}
            />
          )}
        </div>
      </section>

      {papers.length > 0 && (
        <section className={styles.papersSection}>
          <div className={styles.papersTitle}>Joint Publications</div>
          {papers.map((paper) => (
            <ResearchCard key={paper.id} paper={paper} onOpenStory={openStory} />
          ))}
        </section>
      )}

      <StoryModal
        open={story.open}
        title={story.title}
        figures={story.figures}
        onClose={closeStory}
      />
    </>
  )
}
