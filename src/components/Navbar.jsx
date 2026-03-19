import { Link, useLocation } from 'react-router-dom'
import { Activity, LayoutDashboard, MessageSquare, Scan, PieChart, Utensils, Smartphone, Calculator } from 'lucide-react'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Overview', icon: <Activity size={16} /> },
    { path: '/dashboard', label: 'User Hub', icon: <LayoutDashboard size={16} /> },
    { path: '/vision', label: 'Workout AI', icon: <Scan size={16} /> },
    { path: '/nutrition', label: 'Nutrition', icon: <Utensils size={16} /> },
    { path: '/analytics', label: 'Analytics', icon: <PieChart size={16} /> },
    { path: '/chat', label: 'AI Brain', icon: <MessageSquare size={16} /> },
    { path: '/integrations', label: 'Integrations', icon: <Smartphone size={16} /> },
    { path: '/counter', label: 'Rep Counter', icon: <Calculator size={16} /> },
  ]

  return (
    <nav className="navbar-v2">
      <div className="nav-brand">
        <Activity size={24} className="accent-green" />
        <span className="brand-name">BeastTrack</span>
      </div>
      <ul className="nav-links-v2">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link to={item.path} className={`nav-link-v2 ${location.pathname === item.path ? 'active' : ''}`}>
              <span className="nav-icon-v2">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="nav-actions-v2">
        <Link to="/counter" className="btn-join">Live Counter</Link>
      </div>
    </nav>
  )
}
