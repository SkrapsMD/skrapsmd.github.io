import type { ApplicationRow, Proof } from '@/data/applications'
import { Badge, Button, Table } from '@/ui'
import styles from './AppTrackerTable.module.css'

export interface AppTrackerTableProps {
  /** The school rows, in table order. */
  rows: ApplicationRow[]
  /** Opens the proof modal for a row that has a proof. */
  onOpenProof: (proof: Proof, school: string) => void
}

/**
 * The 20-school PhD application table — ported from the
 * .table--borderless block in 05_applicationTracker.html. Status and decision
 * render as @/ui Badges, and rows carrying a proof show a small "View" button
 * that calls onOpenProof.
 */
export function AppTrackerTable({ rows, onOpenProof }: AppTrackerTableProps) {
  return (
    <div className={styles.scrollWrapper}>
      <Table variant="borderless">
        <thead>
          <tr>
            <th> </th>
            <th>School Name</th>
            <th>Deadline</th>
            <th>Status</th>
            <th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rank}>
              <td>{row.rank}</td>
              <td>{row.school}</td>
              <td>{row.deadline}</td>
              <td>
                <Badge variant={row.statusVariant}>{row.status}</Badge>
              </td>
              <td>
                {row.decision && (
                  <Badge variant={row.decisionVariant ?? 'default'}>{row.decision}</Badge>
                )}
                {row.proof && (
                  <Button
                    variant="ghost"
                    className={styles.proofBtn}
                    aria-label="View proof"
                    onClick={() => onOpenProof(row.proof!, row.school)}
                  >
                    View
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
