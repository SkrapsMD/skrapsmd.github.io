import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import styles from './Layout.module.css'

type NavLinkItem = { to: string; label: string; end?: boolean }
type NavGroupItem = { label: string; items: NavLinkItem[] }
type NavItem = NavLinkItem | NavGroupItem

const isGroup = (item: NavItem): item is NavGroupItem => 'items' in item

const NAV: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/research', label: 'Research' },
  { to: '/presentations', label: 'Presentations' },
  { to: '/code', label: 'Code & Data' },
  { to: '/people', label: 'People' },
  { to: '/specimen', label: 'Design Reference' },
  {
    label: 'Personal Trackers',
    items: [
      { to: '/calendar', label: 'Calendar' },
      { to: '/applications', label: 'PhD App. Tracker' },
    ],
  },
  { to: '/sitemap', label: 'Sitemap' },
]

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const closeMenu = () => {
    setMenuOpen(false)
    setOpenGroup(null)
  }

  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Publish the sticky masthead's height as --masthead-h so pages can pin their
  // own content directly beneath it (the calendar's day-detail bar). The nav
  // wraps at some widths, so the height is measured, not hard-coded.
  const mastheadRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = mastheadRef.current
    if (!el) return
    const setH = () =>
      document.documentElement.style.setProperty('--masthead-h', `${el.offsetHeight}px`)
    setH()
    const ro = new ResizeObserver(setH)
    ro.observe(el)
    window.addEventListener('resize', setH)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', setH)
    }
  }, [])

  // Dismiss an open nav group on Escape (focus returns to its trigger) or on a
  // click anywhere outside the nav. Only listens while a group is open.
  useEffect(() => {
    if (!openGroup) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      triggerRefs.current[openGroup]?.focus()
      setOpenGroup(null)
    }
    const onPointerDown = (e: MouseEvent) => {
      if (navRef.current?.contains(e.target as Node)) return
      setOpenGroup(null)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [openGroup])

  // Never leave a group hanging open across a navigation (e.g. browser back).
  useEffect(() => {
    setOpenGroup(null)
  }, [pathname])

  return (
    <div className={styles.frame}>
      <header ref={mastheadRef} className={styles.masthead}>
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

        <nav
          ref={navRef}
          className={`${styles.navbars} ${menuOpen ? styles.navbarsOpen : ''}`}
        >
          {NAV.map((item) => {
            if (!isGroup(item)) {
              return (
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
              )
            }

            const open = openGroup === item.label
            const panelId = `nav-group-${slug(item.label)}`
            const groupActive = item.items.some((child) => pathname === child.to)

            return (
              <div key={item.label} className={styles.navGroup}>
                <button
                  type="button"
                  ref={(el) => {
                    triggerRefs.current[item.label] = el
                  }}
                  className={`${styles.navbtn} ${styles.navGroupBtn} ${
                    groupActive ? styles.active : ''
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenGroup((current) => (current === item.label ? null : item.label))}
                >
                  <span className={styles.dot} aria-hidden="true" />
                  {item.label}
                  <span className={styles.caret} aria-hidden="true">
                    {open ? '▾' : '▸'}
                  </span>
                </button>

                {open && (
                  <div id={panelId} role="menu" className={styles.navGroupPanel}>
                    {item.items.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={child.end}
                        role="menuitem"
                        onClick={closeMenu}
                        className={({ isActive }) =>
                          `${styles.navbtn} ${styles.navGroupItem} ${
                            isActive ? styles.active : ''
                          }`
                        }
                      >
                        <span className={styles.dot} aria-hidden="true" />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className={`${styles.rule} ${styles.ruleFlush}`} />
      </header>

      <main className={styles.content}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
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
