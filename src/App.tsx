import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './layout/Layout'
import Home from './pages/Home'
import Research from './pages/Research'
import Code from './pages/Code'
import Applications from './pages/Applications'
import People from './pages/People'
import PersonProfile from './pages/PersonProfile'
import Sitemap from './pages/Sitemap'
import Licensing from './pages/Licensing'

// Heavy routes are code-split so their weight (the Specimen palette grids; the
// geocoder's xlsx dependency) stays out of the initial bundle.
const Specimen = lazy(() => import('./pages/Specimen'))
const Geocoder = lazy(() => import('./pages/Geocoder'))

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="research" element={<Research />} />
          <Route path="code" element={<Code />} />
          <Route path="applications" element={<Applications />} />
          <Route path="people" element={<People />} />
          <Route path="person/:slug" element={<PersonProfile />} />
          <Route path="specimen" element={<Specimen />} />
          <Route path="sitemap" element={<Sitemap />} />
          <Route path="geocoder" element={<Geocoder />} />
          <Route path="licensing" element={<Licensing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
