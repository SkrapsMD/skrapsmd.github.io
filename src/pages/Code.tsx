import { Link } from 'react-router-dom'
import { Badge, TableCaption } from '@/ui'
import { WipBanner } from '@/components/WipBanner/WipBanner'
import styles from './Code.module.css'

export default function Code() {
  return (
    <>
      <TableCaption category="Code & Data |" title="Tools" size="lg" />

      <div className={styles.card}>
        <div className={styles.titleRow}>
          <div className={styles.title}>Geocoder &mdash; address-to-coordinates</div>
          <span className={`mono ${styles.date}`}>2026-05-20</span>
        </div>
        <div className={styles.body}>
          Upload a spreadsheet (<code>.xlsx</code>, <code>.xls</code>, or <code>.csv</code>) of
          U.S. addresses and the tool will append <code>latitude</code> and{' '}
          <code>longitude</code> columns. Column names don&rsquo;t have to match exactly &mdash;
          address, city, state, and ZIP columns are auto-detected and shown for confirmation
          alongside a 5-row preview before geocoding runs. A street address is optional; rows
          without one fall back to a city + state + ZIP lookup, and rows that still fail to that
          fall back one more step to a ZIP centroid. Any extra columns in the source file are
          preserved on download. Runs entirely in your browser; addresses are sent only to the
          U.S. Census public geocoder (with OpenStreetMap as the final ZIP-only fallback).
        </div>
        <div className={styles.badges}>
          <Badge variant="info">Tools</Badge>
          <Badge variant="info">Geospatial</Badge>
        </div>
        <div className={styles.action}>
          <Link className={styles.linkBtn} to="/geocoder">
            Use Tool &rarr;
          </Link>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.titleRow}>
          <div className={styles.title}>20th Century Post Offices &mdash; 1896&ndash;1910</div>
          <span className={`mono ${styles.date}`}>2026-08-10</span>
        </div>
        <div className={styles.body}>
          Every office in the Post Office Department&rsquo;s Item 95 statement of free city
          delivery, mapped year by year, alongside views laying the offices over the railroad
          network they posted mail onto, county outcomes, and voting for radical parties.
        </div>
        <div className={styles.badges}>
          <Badge variant="info">Tools</Badge>
          <Badge variant="info">Geospatial</Badge>
          <Badge variant="info">Economic History</Badge>
        </div>
        <div className={styles.action}>
          {/* A real path, not a router Link: the explorer is a standalone page in
              public/, opened in its own tab. Name index.html explicitly — the dev
              server does not resolve a directory to its index, so the bare
              /tools/post-offices/ form falls through to the SPA and lands on Home. */}
          <a
            className={styles.linkBtn}
            href="/tools/post-offices/index.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Use Tool &rarr;
          </a>
        </div>
      </div>

      <TableCaption category="Code & Data |" title="Code Packages" size="lg" />
      {/* Code packages such as sparklib will be listed here. */}
      <WipBanner />

      <TableCaption category="Code & Data |" title="Datasets" size="lg" />
      {/* Compiled datasets will be listed here. */}
      <WipBanner />
    </>
  )
}
