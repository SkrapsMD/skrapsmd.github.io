import { Table } from 'skrapsmd-website'

export const Default = () => (
  <Table>
    <thead>
      <tr>
        <th>School</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Yale University</td>
        <td>Submitted</td>
      </tr>
      <tr>
        <td>Stanford University</td>
        <td>Rejected</td>
      </tr>
    </tbody>
  </Table>
)

export const Compact = () => (
  <Table variant="compact" hoverable>
    <thead>
      <tr>
        <th>Quarter</th>
        <th>Price growth</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>2025 Q1</td>
        <td>0.7 pp</td>
      </tr>
      <tr>
        <td>2025 Q2</td>
        <td>0.3 pp</td>
      </tr>
    </tbody>
  </Table>
)

export const Borderless = () => (
  <Table variant="borderless">
    <thead>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>GRE Quantitative</td>
        <td>170 (P91)</td>
      </tr>
      <tr>
        <td>GRE Verbal</td>
        <td>162 (P89)</td>
      </tr>
    </tbody>
  </Table>
)
