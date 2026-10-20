import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import SidebarNav from './SidebarNav'
import TopBar from './TopBar'
import GymMascot from './GymMascot'
import { fetchProfile } from '../services/api'
import './AppShell.css'

export default function AppShell({ children }) {
  const location = useLocation()
  // Drawer is open only for the path it was opened on, so navigating closes it.
  const [navOpenPath, setNavOpenPath] = useState(null)
  const navOpen = navOpenPath === location.pathname
  const setNavOpen = (open) => setNavOpenPath(open ? location.pathname : null)

  useEffect(() => {
    let mounted = true

    async function syncGenderTheme() {
      try {
        const profile = await fetchProfile()
        if (!mounted) return
        const isFemale = (profile?.gender || '').toLowerCase() === 'female'
        document.body.classList.toggle('female-theme-active', isFemale)
      } catch {
        if (!mounted) return
        document.body.classList.remove('female-theme-active')
      }
    }

    syncGenderTheme()

    return () => {
      mounted = false
      document.body.classList.remove('female-theme-active')
    }
  }, [])

  return (
    <div className="shell-root">
      <SidebarNav open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} />}
      <div className="shell-main">
        <TopBar onMenuClick={() => setNavOpen(true)} />
        <section className="shell-content">{children}</section>
      </div>
      <GymMascot />
    </div>
  )
}
