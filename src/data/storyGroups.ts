export interface StoryFigure {
  label: string
  src: string
  height?: number
}

export type StoryGroups = Record<string, StoryFigure[]>

export const storyGroups: StoryGroups = {
  baslandze2026ai: [
    { label: 'Figure 1', src: 'https://flo.uri.sh/visualisation/27989265/embed', height: 500 },
    { label: 'Figure 2', src: 'https://flo.uri.sh/visualisation/27989925/embed', height: 500 },
    { label: 'Figure 3', src: 'https://flo.uri.sh/visualisation/27990103/embed', height: 500 },
    { label: 'Figure 4', src: 'https://flo.uri.sh/visualisation/27990889/embed', height: 500 },
    { label: 'Figure 5', src: 'https://flo.uri.sh/visualisation/27991692/embed', height: 500 },
    { label: 'Figure 6', src: 'https://flo.uri.sh/visualisation/28006570/embed', height: 500 },
    { label: 'Figure 7', src: 'https://flo.uri.sh/visualisation/28012838/embed', height: 550 },
    { label: 'Figure 8', src: 'https://flo.uri.sh/visualisation/28031289/embed', height: 700 },
  ],
}
