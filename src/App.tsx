import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './layout/Layout'
import Home from './pages/Home'
import Research from './pages/Research'
import Code from './pages/Code'
import Applications from './pages/Applications'
import People from './pages/People'
import PersonProfile from './pages/PersonProfile'
import Specimen from './pages/Specimen'
import Sitemap from './pages/Sitemap'
import Geocoder from './pages/Geocoder'
import Licensing from './pages/Licensing'

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
          <Route path="person-:slug" element={<PersonProfile />} />
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
