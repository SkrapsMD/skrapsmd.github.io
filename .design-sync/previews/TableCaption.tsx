import { Table, TableCaption } from 'skrapsmd-website'

export const AboveTable = () => (
  <div>
    <TableCaption category="Research" title="Recent Publications" />
    <Table variant="compact">
      <tbody>
        <tr>
          <td>Tariffs and Consumer Prices</td>
          <td>2025</td>
        </tr>
      </tbody>
    </Table>
  </div>
)

export const Large = () => (
  <TableCaption category="People Index" title="Federal Reserve Bank of Atlanta" size="lg" />
)
