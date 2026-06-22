import { Panel } from 'skrapsmd-website'

export const WithTitle = () => (
  <Panel title="Abstract">
    We evaluate the impact of various US tariff scenarios on consumer prices using novel
    micro-level data linking imports to consumer expenditures.
  </Panel>
)

export const Muted = () => (
  <Panel title="Notes" variant="muted">
    Decision outcomes are updated only after official communication from the department.
  </Panel>
)
