import type { ReactNode } from 'react'
import styles from './Field.module.css'

export interface FieldProps {
  /** Label text shown above the control. */
  label: string
  /** Associates the label with a control's id. */
  htmlFor?: string
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, children, className = '' }: FieldProps) {
  return (
    <div className={`${styles.field} ${className}`.trim()}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}
