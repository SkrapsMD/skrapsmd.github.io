import { useState } from 'react'
import { applications } from '@/data/applications'
import type { Proof } from '@/data/applications'
import { AppTrackerTable } from '@/components/AppTrackerTable/AppTrackerTable'
import { ProofModal } from '@/components/ProofModal/ProofModal'
import { Badge, Table, TableCaption } from '@/ui'
import styles from './Applications.module.css'

interface ProofModalState {
  open: boolean
  proof: Proof | null
  school?: string
}

export default function Applications() {
  const [modal, setModal] = useState<ProofModalState>({ open: false, proof: null })

  const openProof = (proof: Proof, school: string) => {
    setModal({ open: true, proof, school })
  }

  const closeProof = () => {
    setModal((prev) => ({ ...prev, open: false }))
  }

  return (
    <>
      {/* ===== SUMMARY ===== */}
      <section className={styles.trackerGrid}>
        <div className={styles.trackerIntro}>
          <TableCaption category="PhD APPLICATION TRACKER |" title="2025-2026 Cycle" size="lg" />

          <div className={`muted small ${styles.trackerDescription}`}>
            <p>
              I applied for Economics PhD Programs during the 2025-2026 application season while I
              was employed as an Economic Research Analyst at the{' '}
              <a
                href="https://www.frbatlanta.org/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.trackerLink}
              >
                Federal Reserve Bank of Atlanta
              </a>
              . This tracker was created to provide my family and friends a convenient way to track
              the process. I keep it posted on my website in a relatively prominent location for
              potential future applicants to glean some insight from.
            </p>

            <p>
              If you have any questions about my application, please feel free to contact me via the
              contact-card on the <code>Home</code> tab.
            </p>

            <p>
              <Badge variant="info">UPDATE</Badge>: On 4/15/2026 I accepted admission to the
              University of California, San Diego. I am incredibly grateful to all the mentors,
              colleagues, friends, and family who supported me throughout this process.
            </p>
          </div>
        </div>

        <div className={styles.trackerStats}>
          <Table variant="compact">
            <tbody>
              <tr>
                <th scope="row">Status</th>
                <td>Attending UCSD</td>
              </tr>
              <tr>
                <th scope="row">Deadlines</th>
                <td className="mono">12/1/2025 &mdash; 1/15/2025</td>
              </tr>
              <tr>
                <th scope="row">No. Schools</th>
                <td>20</td>
              </tr>
              <tr>
                <th scope="row">Cost</th>
                <td className="mono">
                  <div>$1,733.66 Fees · $800.00 GRE Scores</div>
                  <div>$2,533.66 Total</div>
                </td>
              </tr>
              <tr>
                <th scope="row">GRE</th>
                <td className={styles.alignedList}>
                  <div>
                    <span className={styles.label}>Quantitative</span>
                    <span className={styles.sep}></span> 170 (P91)
                  </div>
                  <div>
                    <span className={styles.label}>Verbal</span>
                    <span className={styles.sep}></span> 162 (P89)
                  </div>
                  <div>
                    <span className={styles.label}>Analytical</span>
                    <span className={styles.sep}></span> 6.0 &nbsp;(P99)
                  </div>
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </section>

      <div className={styles.rule}></div>

      {/* ===== SCHOOL LIST ===== */}
      <TableCaption category="PhD Application Tracker |" title="School List" />

      <AppTrackerTable rows={applications} onOpenProof={openProof} />

      <div className={`${styles.tableFooter} small muted`}>
        <div className={styles.tableLegend}>
          <Badge variant="success">SUBMITTED / Accepted</Badge>
          <Badge variant="unsure">PENDING</Badge>
          <Badge variant="warning">WAITLIST / UNCERTAIN</Badge>
          <Badge variant="failure">REJECTED / INCOMPLETE</Badge>
        </div>

        <div className={styles.tableNotes}>
          <i>Notes</i>
          <ol>
            <li>
              <em>Application Status</em> reflects whether all required materials (including letters,
              transcripts, and test scores) were received by the program.
            </li>
            <li>
              <em>Decision Outcome</em> is updated only after official communication from the
              department.
            </li>
          </ol>
        </div>
      </div>

      <ProofModal
        open={modal.open}
        proof={modal.proof}
        school={modal.school}
        onClose={closeProof}
      />
    </>
  )
}
