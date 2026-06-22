import { Link } from 'react-router-dom'
import { Table, TableCaption } from '@/ui'
import styles from './Home.module.css'

export default function Home() {
  return (
    <div>
      <section className={styles.grid}>
        <div className={styles.content}>
          <TableCaption category="Welcome" title="" size="lg" />

          <div className={`medsmall ${styles.text}`}>
            <p>
              I&apos;m about as happy to have you here as you are to be here. If you are a friend or
              acquaintance just peeping in, it&apos;s nice to see you again, feel free to drop a line
              any time via the contact information on the right. If you are an academic acquaintance
              looking for a research paper or code snippet, I would encourage you to check under the{' '}
              <code>Research</code> or <code>Code &amp; Data</code> tabs above.
            </p>

            <p>
              For those of you who have the pleasure of not knowing me personally&hellip; Hello! My
              name is Michael Dwight Sparks (as evidenced by the banner at the header of this page)
              and I am an Economics Research Analyst at the{' '}
              <a
                href="http://atlantafed.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Federal Reserve Bank of Atlanta
              </a>{' '}
              working with Drs.{' '}
              <Link to="/person/salome-baslandze">Salom&eacute; Baslandze</Link> and{' '}
              <Link to="/person/lei-fang">Lei Fang</Link>.
            </p>
          </div>
        </div>

        <div className={styles.contact}>
          <Table variant="compact">
            <tbody>
              <tr>
                <td colSpan={2} className={styles.portraitCell}>
                  <img
                    src="/images/people_index/MichaelSparks_Drawing_Kiky.webp"
                    alt="Hand Drawn Rendering of Michael Dwight Sparks. Credit to @mangdesain on Fiverr"
                    className={styles.portrait}
                    width={512}
                    height={768}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Email</th>
                <td>
                  <a href="mailto:mdsparks@roarkworks.com" className={styles.link}>
                    mdsparks@roarkworks.com
                  </a>
                </td>
              </tr>
              <tr>
                <th scope="row">Phone</th>
                <td className="mono">+1(571)882-0433</td>
              </tr>
              <tr>
                <th scope="row">GitHub</th>
                <td>
                  <a
                    href="https://github.com/skrapsmd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    SkrapsMD
                  </a>
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </section>

      <div className={styles.phdNotice}>
        I am an incoming Economics PhD student at the University of California, San Diego.
      </div>
    </div>
  )
}
