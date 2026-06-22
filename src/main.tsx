import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/styles.css'

// Preserve legacy hash links (#research, #person-foo) by normalizing them to the
// HashRouter form (#/research) before the router mounts.
const { hash } = window.location
if (hash.length > 1 && hash[1] !== '/') {
  window.location.hash = '#/' + hash.slice(1)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
