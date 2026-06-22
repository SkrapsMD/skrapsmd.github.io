import { Badge } from 'skrapsmd-website'

export const Topics = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <Badge variant="highlight">Inflation</Badge>
    <Badge variant="info">Trade Policy</Badge>
    <Badge variant="success">Labor Markets</Badge>
  </div>
)

export const Statuses = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <Badge variant="success">Accepted</Badge>
    <Badge variant="warning">Waitlisted</Badge>
    <Badge variant="failure">Rejected</Badge>
    <Badge variant="unsure">Pending</Badge>
  </div>
)

export const Default = () => <Badge>Working Paper</Badge>
