import SidebarNav from './SidebarNav'
import TopBar from './TopBar'
import GymMascot from './GymMascot'
import './AppShell.css'

export default function AppShell({ children }) {
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
