import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ResearchPaper } from '@/data/research'
import type { StoryFigure } from '@/data/storyGroups'
import { storyGroups } from '@/data/storyGroups'
import { Badge, Button } from '@/ui'
import styles from './ResearchCard.module.css'

export interface ResearchCardProps {
  paper: ResearchPaper
  /** Opens the shared StoryModal with the paper's figure(s) and title. */
  onOpenStory: (figures: StoryFigure[], title: string) => void
}

// Resolve a paper's story figures: a grouped story keys into storyGroups;
// a single story (storySrc) becomes a one-element figure array. Returns null
// when the paper has no data story.
function getStoryFigures(paper: ResearchPaper): StoryFigure[] | null {
  if (paper.storyGroup) {
    const group = storyGroups[paper.storyGroup]
    return group && group.length > 0 ? group : null
  }
  if (paper.storySrc) {
    return [{ label: '', src: paper.storySrc, height: 600 }]
  }
  return null
}

/**
 * Research publication card. Renders title, authors (slugged authors link to
 * their person profile), meta, abstract, badges, action buttons, and press
 * links. Papers with a data story get the clickable left "See Data Story"
 * sidebar; others use the plain left-border card. Reused on the Research page
 * and (later) on person-profile pages.
 */
export function ResearchCard({ paper, onOpenStory }: ResearchCardProps) {
  const [copied, setCopied] = useState(false)
  const figures = getStoryFigures(paper)
  const hasStory = figures !== null

  // Copy bibtex to clipboard with transient "Copied!" feedback (~1500ms),
  // matching setupCitationCopyListeners() in 0_app.js.
  const handleCite = () => {
    if (!paper.bibtex) return
    navigator.clipboard
      .writeText(paper.bibtex)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch((err) => {
        console.error('Failed to copy citation:', err)
      })
  }

  const openStory = () => {
    if (figures) onOpenStory(figures, paper.title)
  }

  const cardBody = (
    <>
      <div className={styles.title}>{paper.title}</div>
      <div className={styles.meta}>
        <span className="mono">
          {paper.authors.map((author, i) => (
            <Fragment key={`${author.name}-${i}`}>
              {i > 0 && ', '}
              {author.slug ? (
                <Link to={`/person-${author.slug}`} className={styles.nameLink}>
                  {author.name}
                </Link>
              ) : (
                author.name
              )}
            </Fragment>
          ))}
        </span>
        {paper.venue && (
          <>
            {' · '}
            <span>{paper.venue}</span>
          </>
        )}
        {paper.date && (
          <>
            {' · '}
            <span>{paper.date}</span>
          </>
        )}
      </div>

      {paper.abstract && (
        <div className={styles.body}>
          <blockquote className={styles.abstract}>
            <strong>Abstract:</strong> <i>{paper.abstract}</i>
          </blockquote>
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {paper.badges.length > 0 && (
            <div className={styles.badges}>
              {paper.badges.map((badge) => (
                <Badge key={badge} variant="info">
                  {badge}
                </Badge>
              ))}
            </div>
          )}
          <div className={styles.actions}>
            {paper.pdfUrl && (
              <Button
                variant="primary"
                href={paper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View PDF
              </Button>
            )}
            {paper.doiUrl && (
              <Button
                variant="ghost"
                href={paper.doiUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                DOI Link
              </Button>
            )}
            {paper.bibtex && (
              <Button variant="ghost" onClick={handleCite}>
                {copied ? 'Copied!' : 'Cite'}
              </Button>
            )}
          </div>
        </div>
        {paper.press.length > 0 && (
          <div className={styles.pressLinks}>
            {paper.press.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  )

  if (hasStory) {
    return (
      <div className={`${styles.card} ${styles.cardHasStory}`}>
        <div
          className={styles.sidebar}
          role="button"
          tabIndex={0}
          aria-label={`Open data story: ${paper.title}`}
          onClick={openStory}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openStory()
            }
          }}
        />
        <div className={styles.cardContent}>{cardBody}</div>
      </div>
    )
  }

  return <div className={styles.card}>{cardBody}</div>
}
