import { Button } from 'skrapsmd-website'

export const Variants = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button variant="default">View PDF</Button>
    <Button variant="primary">Submit</Button>
    <Button variant="ghost">Cite</Button>
  </div>
)

export const AsLink = () => (
  <Button variant="primary" href="https://doi.org/10.29338/ph2025-01" target="_blank" rel="noopener noreferrer">
    Open DOI
  </Button>
)

export const Disabled = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <Button disabled>Unavailable</Button>
    <Button variant="primary" disabled>
      Submitting…
    </Button>
  </div>
)
