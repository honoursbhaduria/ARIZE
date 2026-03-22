import { useMemo } from 'react'
import { Search, Bell, User, Plus } from 'lucide-react'
import { getCurrentUser } from '../services/api'

export default function TopBar() {
  const user = useMemo(() => getCurrentUser(), [])
  
  const displayName = user?.username || 'Guest'
  const initials = useMemo(() => {
    if (!displayName || displayName === 'Guest') return 'G'
    return displayName.slice(0, 2).toUpperCase()
  }, [displayName])

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <div className="search-container">
          <Search className="search-icon" size={16} />
          <input type="text" placeholder="Search features, workouts..." className="search-input" />
        </div>
      </div>

      <div className="top-bar-right">
        <button className="icon-button" aria-label="Notifications">
          <Bell size={20} />
        </button>

        <div className="profile-trigger">
          <div className="avatar" style={{ textTransform: 'uppercase' }}>{initials}</div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'capitalize' }}>{displayName}</span>
        </div>
      </div>
    </header>
  )
}
