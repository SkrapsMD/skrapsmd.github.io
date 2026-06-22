import type { ReactNode } from 'react'
import styles from './Badge.module.css'

export type BadgeVariant =
  | 'default'
  | 'highlight'
  | 'info'
  | 'success'
  | 'failure'
  | 'warning'
  | 'unsure'

export interface BadgeProps {
  /** Color treatment. `default` = bordered, others map to the highlight palette. */
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantClass: Record<BadgeVariant, string> = {
  default: '',
  highlight: styles.highlight,
  info: styles.info,
  success: styles.success,
  failure: styles.failure,
  warning: styles.warning,
  unsure: styles.unsure,
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${variantClass[variant]} ${className}`.trim()}>
      {children}
    </span>
  )
}
