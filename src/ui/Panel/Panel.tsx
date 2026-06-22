import type { ReactNode } from 'react'
import styles from './Panel.module.css'

export interface PanelProps {
  /** Optional bold heading rendered at the top of the panel. */
  title?: string
  /** `muted` gives the panel a muted background and softer border. */
  variant?: 'default' | 'muted'
  children: ReactNode
  className?: string
}

export function Panel({ title, variant = 'default', children, className = '' }: PanelProps) {
  const cls = `${styles.panel} ${variant === 'muted' ? styles.muted : ''} ${className}`.trim()
  return (
    <section className={cls}>
      {title && <div className={styles.title}>{title}</div>}
      {children}
    </section>
  )
}
