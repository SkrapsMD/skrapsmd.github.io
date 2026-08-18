// Headless render smoke test: bundle the page components with esbuild (CSS
// modules stubbed), render each route to static HTML, and assert no crash +
// key content present. Run: node scripts/ssr-smoke.mjs
import { build } from 'esbuild'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'

const root = process.cwd()

const ENTRY = `
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Research from '@/pages/Research'
import Presentations from '@/pages/Presentations'
import PresentationViewer from '@/pages/PresentationViewer'
import People from '@/pages/People'
import PersonProfile from '@/pages/PersonProfile'
import Specimen from '@/pages/Specimen'
import Applications from '@/pages/Applications'
import Code from '@/pages/Code'
import Geocoder from '@/pages/Geocoder'
import Calendar from '@/pages/Calendar'
import Sitemap from '@/pages/Sitemap'
import Licensing from '@/pages/Licensing'

const render = (el, entries) =>
  ReactDOMServer.renderToStaticMarkup(
    React.createElement(MemoryRouter, { initialEntries: entries }, el)
  )

const results = []
const check = (name, fn, asserts) => {
  try {
    const html = fn()
    const missing = Object.entries(asserts)
      .filter(([, needle]) => !html.includes(needle))
      .map(([label]) => label)
    results.push({ name, ok: missing.length === 0, len: html.length, missing })
  } catch (e) {
    results.push({ name, ok: false, error: e && e.message })
  }
}

check('Home', () => render(React.createElement(Home), ['/']), {
  name: 'Michael Dwight Sparks', email: 'mailto:', portrait: '/images/people_index/',
})
check('Research', () => render(React.createElement(Research), ['/']), {
  group: 'Federal Reserve Bank of Atlanta',
})
check('Presentations', () => render(React.createElement(Presentations), ['/']), {
  heading: 'Talks &amp; Presentations', talk: 'Baumol', link: '/presentations/baumol-monetary-policy',
})
check('PresentationViewer', () =>
  ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      MemoryRouter, { initialEntries: ['/presentations/baumol-monetary-policy'] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: 'presentations/:slug', element: React.createElement(PresentationViewer) }))
    )
  ), { title: 'Monetary Policy', event: 'Competitive Edge 2026', firstSlide: 'Michael Dwight Sparks' })
check('People', () => render(React.createElement(People), ['/']), {
  person: 'Baslandze', link: '/person/',
})
check('Specimen', () => render(React.createElement(Specimen), ['/']), {
  fontSpecimen: 'Font Specimen', palette: 'Palette',
})
check('Applications', () => render(React.createElement(Applications), ['/']), {
  cycle: '2025-2026', school: 'Yale',
})
check('Code', () => render(React.createElement(Code), ['/']), {
  tools: 'Tools', geocoderLink: '/geocoder',
  postOfficesLink: '/tools/post-offices/index.html',
})
check('Geocoder', () => render(React.createElement(Geocoder), ['/']), {})
// The grid now opens on the current week, so which quarter is on screen depends
// on the run date. Assert on date-independent anchors instead: the header line,
// the layer filters, and the weekday row that every rendered block emits.
check('Calendar', () => render(React.createElement(Calendar), ['/']), {
  today: 'Today is', layers: 'Layers', grid: '>Sun<',
})
check('Sitemap', () => render(React.createElement(Sitemap), ['/']), {
  wip: 'WORK IN PROGRESS',
})
check('Licensing', () => render(React.createElement(Licensing), ['/']), {
  licensing: 'Licensing',
})
check('PersonProfile', () =>
  ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      MemoryRouter, { initialEntries: ['/person/salome-baslandze'] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: 'person/:slug', element: React.createElement(PersonProfile) }))
    )
  ), { name: 'Baslandze', jointPubs: 'Joint Publications' })

console.log(JSON.stringify(results, null, 2))
const failed = results.filter((r) => !r.ok)
if (failed.length) process.exitCode = 1
`

const cssStub = {
  name: 'css-stub',
  setup(b) {
    b.onResolve({ filter: /\.css$/ }, (args) => ({ path: args.path, namespace: 'cssstub' }))
    b.onLoad({ filter: /.*/, namespace: 'cssstub' }, () => ({
      contents: 'export default new Proxy({}, { get: (_, p) => String(p) })',
      loader: 'js',
    }))
  },
}

const out = await build({
  stdin: { contents: ENTRY, resolveDir: root, loader: 'tsx', sourcefile: 'ssr-entry.tsx' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  alias: { '@': path.join(root, 'src') },
  external: ['react', 'react-dom', 'react-dom/server', 'react-router-dom', 'xlsx'],
  plugins: [cssStub],
  write: false,
})

// Write inside the project so node resolves the external react packages from
// the project's node_modules, then clean up.
const file = path.join(root, '.ssr-smoke-bundle.mjs')
await writeFile(file, out.outputFiles[0].text)
try {
  await import(pathToFileURL(file).href)
} finally {
  await rm(file, { force: true })
}
