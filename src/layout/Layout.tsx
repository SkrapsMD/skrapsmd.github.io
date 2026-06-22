import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import styles from './Layout.module.css'

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/research', label: 'Research' },
  { to: '/code', label: 'Code & Data' },
  { to: '/applications', label: 'PhD App. Tracker' },
  { to: '/people', label: 'People' },
  { to: '/specimen', label: 'Design Reference' },
  { to: '/sitemap', label: 'Sitemap' },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className={styles.frame}>
      <header className={styles.masthead}>
        <div className={styles.mastheadTop}>
          <Link to="/" className={styles.brand} onClick={closeMenu}>
            <img
              className={styles.brandIcon}
              src="/images/people_index/MichaelSparks_Outline_GPT.webp"
              alt="Michael Dwight Sparks Logo"
              width={512}
              height={768}
            />
            <span className={styles.brandTitle}>Michael Dwight Sparks</span>
          </Link>
          <button
            className={styles.hamburger}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
          </button>
        </div>

        <nav className={`${styles.navbars} ${menuOpen ? styles.navbarsOpen : ''}`}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `${styles.navbtn} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.dot} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={`${styles.rule} ${styles.ruleFlush}`} />
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>

      <footer className={styles.foot}>
        <div className={styles.rule} />
        <div className={styles.footMeta}>
          <span className="mono">© 2026</span>
          <span className="mono">·</span>
          <span className="mono">Built static</span>
        </div>
      </footer>
    </div>
  )
}
