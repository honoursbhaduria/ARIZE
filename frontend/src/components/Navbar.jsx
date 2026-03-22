import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Activity, LayoutDashboard, MessageSquare, Scan, PieChart, Utensils, Smartphone, Calculator } from 'lucide-react'
import { clearAuthSession, isAuthenticated } from '../services/api'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const authenticated = isAuthenticated()

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

  const handleLogout = () => {
    clearAuthSession()
    navigate('/login')
  }

  return (
    <nav className="navbar-v2">
      <div className="nav-brand">
        <Activity size={24} className="accent-green" />
        <span className="brand-name">ARIZE</span>
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
        {authenticated ? (
          <>
            <span className="nav-quote-pill">"Discipline turns goals into results."</span>
            <button type="button" className="btn-logout" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-join">Login</Link>
            <Link to="/register" className="btn-ghost">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}
