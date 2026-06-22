import { TableCaption } from '@/ui'
import styles from './Licensing.module.css'

export default function Licensing() {
  return (
    <section className={styles.page}>
      <TableCaption category="About |" title="Licensing & Credits" size="lg" />

      <p className={`muted small ${styles.intro}`}>
        The resources used to build this site and the licenses that apply to them.
      </p>

      <ul className={styles.list}>
        <li className={styles.item}>
          <div className={styles.resource}>
            <a
              href="https://fonts.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Fonts
            </a>
          </div>
          <div className={`small ${styles.license}`}>
            Licensed under the{' '}
            <a
              href="https://openfontlicense.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              SIL Open Font License
            </a>
            .
          </div>
        </li>

        <li className={styles.item}>
          <div className={styles.resource}>
            <a
              href="https://learn.microsoft.com/en-us/typography/opentype/spec/"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenType
            </a>
          </div>
          <div className={`small ${styles.note}`}>
            For access to typographic features such as ligatures and small caps.
          </div>
        </li>
      </ul>
    </section>
  )
}
