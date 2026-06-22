import type { ReactNode } from 'react'
import styles from './CodeBlock.module.css'

export interface CodeBlockProps {
  children: ReactNode
  className?: string
}

export function CodeBlock({ children, className = '' }: CodeBlockProps) {
  return <pre className={`${styles.codeBlock} ${className}`.trim()}>{children}</pre>
}
