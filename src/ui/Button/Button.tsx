import type { MouseEventHandler, ReactNode } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'default' | 'primary' | 'ghost'

export interface ButtonProps {
  /** Visual style. `default` = bordered, `primary` = solid emphasis, `ghost` = emphasis outline. */
  variant?: ButtonVariant
  children: ReactNode
  /** When set, the button renders as an anchor (`<a>`) pointing here. */
  href?: string
  /** Anchor target (only used with `href`). */
  target?: string
  /** Anchor rel (only used with `href`). */
  rel?: string
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>
  disabled?: boolean
  /** Button type (ignored when `href` is set). */
  type?: 'button' | 'submit' | 'reset'
  title?: string
  'aria-label'?: string
  'aria-pressed'?: boolean
  className?: string
}

const variantClass: Record<ButtonVariant, string> = {
  default: '',
  primary: styles.primary,
  ghost: styles.ghost,
}

export function Button({
  variant = 'default',
  className = '',
  children,
  href,
  ...rest
}: ButtonProps) {
  const cls = `${styles.btn} ${variantClass[variant]} ${className}`.trim()
  if (href !== undefined) {
    const { target, rel, onClick, title } = rest
    return (
      <a
        className={cls}
        href={href}
        target={target}
        rel={rel}
        title={title}
        aria-label={rest['aria-label']}
        onClick={onClick}
      >
        {children}
      </a>
    )
  }
  return (
    <button
      className={cls}
      type={rest.type ?? 'button'}
      disabled={rest.disabled}
      title={rest.title}
      aria-label={rest['aria-label']}
      aria-pressed={rest['aria-pressed']}
      onClick={rest.onClick}
    >
      {children}
    </button>
  )
}
