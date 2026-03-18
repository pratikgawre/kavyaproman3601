import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const initialTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', initialTheme)

let initialSidebarDensity = 'comfortable'
let initialSidebarProjectIcons = 'show'
try {
  const rawAppearance = localStorage.getItem('appearanceSettings')
  const parsedAppearance = rawAppearance ? JSON.parse(rawAppearance) : null
  if (parsedAppearance && typeof parsedAppearance === 'object') {
    if (typeof parsedAppearance.sidebarDensity === 'string') {
      initialSidebarDensity = parsedAppearance.sidebarDensity
    }
    if (typeof parsedAppearance.showProjectIcons === 'boolean') {
      initialSidebarProjectIcons = parsedAppearance.showProjectIcons ? 'show' : 'hide'
    }
  }
} catch {
  // ignore invalid storage values
}
document.documentElement.setAttribute('data-sidebar-density', initialSidebarDensity)
document.documentElement.setAttribute('data-sidebar-project-icons', initialSidebarProjectIcons)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
