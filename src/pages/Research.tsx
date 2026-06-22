import { useCallback, useState } from 'react'
import { research } from '@/data/research'
import type { ResearchPaper } from '@/data/research'
import type { StoryFigure } from '@/data/storyGroups'
import { ResearchCard } from '@/components/ResearchCard/ResearchCard'
import { StoryModal } from '@/components/StoryModal/StoryModal'
import styles from './Research.module.css'

// Group papers by `paper.group`, preserving the order in which groups first
// appear in the data (so section order follows the data, not insertion-sorted).
function groupPapers(papers: ResearchPaper[]): [string, ResearchPaper[]][] {
  const groups = new Map<string, ResearchPaper[]>()
  for (const paper of papers) {
    const existing = groups.get(paper.group)
    if (existing) {
      existing.push(paper)
    } else {
      groups.set(paper.group, [paper])
    }
  }
  return Array.from(groups.entries())
}

interface StoryState {
  open: boolean
  title: string
  figures: StoryFigure[]
}

export default function Research() {
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

  const grouped = groupPapers(research)

  return (
    <>
      {grouped.map(([group, papers]) => (
        <section key={group} className={styles.section}>
          <h2 className={styles.heading}>{group}</h2>
          {papers.map((paper) => (
            <ResearchCard key={paper.id} paper={paper} onOpenStory={openStory} />
          ))}
        </section>
      ))}

      <StoryModal
        open={story.open}
        title={story.title}
        figures={story.figures}
        onClose={closeStory}
      />
    </>
  )
}
