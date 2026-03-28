import { useEffect } from 'react'
import SidebarNav from './SidebarNav'
import TopBar from './TopBar'
import GymMascot from './GymMascot'
import { fetchProfile } from '../services/api'
import './AppShell.css'

export default function AppShell({ children }) {
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
      <SidebarNav />
      <div className="shell-main">
        <TopBar />
        <section className="shell-content">{children}</section>
      </div>
      <GymMascot />
    </div>
  )
}
