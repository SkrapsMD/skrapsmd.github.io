import styles from './WipBanner.module.css'

export interface WipBannerProps {
  /** Use the compact `wip_small` variant (shorter panel, small label). */
  small?: boolean
  /** Banner text. */
  label?: string
}

export function WipBanner({ small = false, label = 'WORK IN PROGRESS' }: WipBannerProps) {
  const panelCls = `${styles.panel} ${small ? styles.small : ''}`.trim()
  return (
    <section className={panelCls}>
      <div className={styles.banner} role="status" aria-label="Work in progress">
        <span className={styles.label}>{label}</span>
      </div>
    </section>
  )
}
