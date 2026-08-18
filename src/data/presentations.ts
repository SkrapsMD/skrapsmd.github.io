export interface Presentation {
  /** URL segment: /presentations/<slug> */
  slug: string
  title: string
  /** The occasion the deck was given at. */
  event: string
  /** Display date, e.g. 'August 18, 2026'. */
  date: string
  /** ISO date, used for ordering. */
  isoDate: string
  /** Where it was given, if shown. */
  location?: string
  /** One-paragraph description shown on the index card. */
  summary: string
  /** Topic tag labels. */
  badges: string[]
  slideCount: number
}

export const presentations: Presentation[] = [
  {
    slug: 'baumol-monetary-policy',
    title: 'Baumol’s Disease and Monetary Policy',
    event: 'Competitive Edge 2026',
    date: 'August 18, 2026',
    isoDate: '2026-08-18',
    summary:
      'Why the least innovative corners of the economy keep getting more expensive, and what that means for monetary policy. Three stops: a string quartet whose pay is set by what its players could earn in a factory, the health care share of GDP from 1929 forward, and the open question — whether wages anchored to biased expected productivity can account for the economy’s weakening response to policy since 1984.',
    badges: ['Baumol’s Cost Disease', 'Monetary Policy', 'Productivity'],
    slideCount: 9,
  },
]

/** Newest first. */
export const presentationsByDate = [...presentations].sort((a, b) =>
  b.isoDate.localeCompare(a.isoDate),
)

export const findPresentation = (slug: string | undefined) =>
  presentations.find((p) => p.slug === slug)
