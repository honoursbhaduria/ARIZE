import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Dumbbell,
  MessageSquare,
  Utensils,
  Flame,
  Smartphone,
  Settings,
  ScanLine,
  LogOut,
  Camera
} from 'lucide-react'
import { clearAuthSession } from '../services/api'

const primaryLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/counter', label: 'Workout / Rep Counter', icon: Dumbbell },
  { to: '/chat', label: 'AI Coach (Chat)', icon: MessageSquare },
  { to: '/nutrition', label: 'Nutrition (Food \u2192 Calories)', icon: Utensils },
  { to: '/gallery', label: 'Progress Gallery', icon: Camera },
  { to: '/analytics', label: 'Progress & Streaks', icon: Flame },
  { to: '/integrations', label: 'Integrations (Wearables)', icon: Smartphone },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function SidebarNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="sidebar-nav">
      <div className="sidebar-brand">
        <Dumbbell size={20} strokeWidth={3} />
        <span>ARIZE</span>
      </div>

      <nav className="sidebar-links">
        {primaryLinks.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.to
          return (
            <Link key={item.to} to={item.to} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-secondary">
        <Link to="/vision" className={`sidebar-link ${location.pathname === '/vision' ? 'active' : ''}`}>
          <ScanLine size={18} />
          <span>Computer Vision</span>
        </Link>
        <button
          type="button"
          className="sidebar-link"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
          onClick={() => {
            clearAuthSession()
            navigate('/login')
          }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
