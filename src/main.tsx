import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/styles.css'

// Preserve legacy hash links (#research, #person-foo) by normalizing them to the
// HashRouter form before the router mounts. Old person links used #person-<slug>;
// the new route is /person/<slug>.
const { hash } = window.location
if (hash.length > 1 && hash[1] !== '/') {
  let routePath = hash.slice(1)
  if (routePath.startsWith('person-')) {
    routePath = 'person/' + routePath.slice('person-'.length)
  }
  window.location.hash = '#/' + routePath
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
