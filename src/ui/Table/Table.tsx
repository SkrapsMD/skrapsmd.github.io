import type { ReactNode } from 'react'
import styles from './Table.module.css'

export type TableVariant = 'default' | 'compact' | 'borderless'

export interface TableProps {
  /** `compact` tightens cell padding; `borderless` shows vertical rules only. */
  variant?: TableVariant
  /** Highlight a row's background on hover. */
  hoverable?: boolean
  children: ReactNode
  className?: string
}

export function Table({
  variant = 'default',
  hoverable = false,
  children,
  className = '',
}: TableProps) {
  const variantClass =
    variant === 'compact' ? styles.compact : variant === 'borderless' ? styles.borderless : ''
  const cls =
    `${styles.table} ${variantClass} ${hoverable ? styles.hoverable : ''} ${className}`.trim()
  return <table className={cls}>{children}</table>
}

export interface TableCaptionProps {
  /** Muted prefix (e.g. a category or section name). */
  category?: string
  /** Emphasised caption title. */
  title: string
  /** `lg` is a slightly larger caption used as a section header. */
  size?: 'sm' | 'lg'
  className?: string
}

export function TableCaption({
  category,
  title,
  size = 'sm',
  className = '',
}: TableCaptionProps) {
  const cls = `${styles.caption} ${size === 'lg' ? styles.captionLg : ''} ${className}`.trim()
  return (
    <div className={cls}>
      {category && <span className={styles.captionCategory}>{category} </span>}
      <span className={styles.captionTitle}>{title}</span>
    </div>
  )
}
