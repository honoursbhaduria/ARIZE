import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dumbbell, Flame, LayoutGrid, LogOut, Sparkles } from 'lucide-react'
import { clearAuthSession, getCurrentUser } from '../services/api'
import { profileQuery, usePlayerStats } from '../lib/queries'
import { Modal } from '../ui/Modal'
import { ProgressBar } from '../ui/components'
import GymMascot from '../components/GymMascot'
import { NAV_GROUPS, TAB_ITEMS, titleForPath } from './nav'
import '../styles/shell.css'

function initialsOf(name) {
  return (name || 'G').slice(0, 2).toUpperCase()
}

function NavLink({ item, onNavigate }) {
  const Icon = item.icon
  return (
    <Link to={item.to} className="nav-link" onClick={onNavigate}>
      <Icon size={19} />
      <span>{item.label}</span>
    </Link>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isLoading = useRouterState({ select: (state) => state.status === 'pending' })
  const [moreOpen, setMoreOpen] = useState(false)
  const user = getCurrentUser()
  const stats = usePlayerStats()
  const profile = useQuery(profileQuery)

  // Pink accent theme for female profiles (existing feature).
  const isFemale = (profile.data?.gender || '').toLowerCase() === 'female'
  useEffect(() => {
    document.body.classList.toggle('female-theme-active', isFemale)
    return () => document.body.classList.remove('female-theme-active')
  }, [isFemale])

  const logout = () => {
    clearAuthSession()
    queryClient.clear()
    setMoreOpen(false)
    navigate({ to: '/login' })
  }

  const moreActive = !TAB_ITEMS.some((item) => pathname.startsWith(item.to))

  return (
    <div className="shell">
      {isLoading && <div className="route-progress" aria-hidden="true" />}

      <aside className="sidebar" aria-label="Main navigation">
        <Link to="/dashboard" className="brand">
          <span className="brand__mark"><Dumbbell size={18} strokeWidth={2.6} /></span>
          ARIZE
        </Link>

        <div className="level-card">
          <div className="level-card__top">
            <span className="avatar">{initialsOf(user?.username)}</span>
            <div className="grow">
              <div className="truncate" style={{ fontWeight: 700 }}>{user?.username || 'Athlete'}</div>
              <div className="level-pill">Lv {stats.level} · {stats.title}</div>
            </div>
          </div>
          <ProgressBar value={stats.progressPct} size="sm" label="Level progress" />
          <div className="spread tiny muted mono">
            <span>{stats.xpIntoLevel} / {stats.xpForLevel} XP</span>
            <span className="row" style={{ gap: 4 }}><Flame size={13} color="var(--orange)" />{stats.streakDays}d</span>
          </div>
        </div>

        <nav>
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group__title">{group.title}</div>
              {group.items.map((item) => <NavLink key={item.to} item={item} />)}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button type="button" className="nav-link" onClick={logout}>
            <LogOut size={19} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="hud">
          <Link to="/dashboard" className="brand hide-desktop" aria-label="ARIZE home">
            <span className="brand__mark"><Dumbbell size={18} strokeWidth={2.6} /></span>
          </Link>
          <div className="hud__title truncate">{titleForPath(pathname)}</div>
          <div className="hud__right">
            <span className="hud-chip hud-chip--streak" title="Streak days">
              <Flame size={15} /> {stats.streakDays}
            </span>
            <span className="hud-chip hud-chip--xp" title="Total XP">
              <Sparkles size={15} /> {stats.xp.toLocaleString()}
            </span>
            <Link to="/settings" className="avatar avatar--sm" aria-label="Profile settings">
              {initialsOf(user?.username)}
            </Link>
          </div>
        </header>

        <main id="main">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Quick navigation">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.to} to={item.to} className="tab">
              <Icon size={21} />
              <span>{item.short}</span>
            </Link>
          )
        })}
        <button type="button" className={`tab ${moreActive ? 'active' : ''}`} onClick={() => setMoreOpen(true)}>
          <LayoutGrid size={21} />
          <span>More</span>
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Everything">
        <div className="level-card">
          <div className="spread">
            <span className="level-pill">Lv {stats.level} · {stats.title}</span>
            <span className="tiny mono muted">{stats.xpIntoLevel} / {stats.xpForLevel} XP</span>
          </div>
          <ProgressBar value={stats.progressPct} size="sm" label="Level progress" />
        </div>
        <div className="sheet-nav">
          {NAV_GROUPS.flatMap((group) => group.items).map((item) => (
            <NavLink key={item.to} item={item} onNavigate={() => setMoreOpen(false)} />
          ))}
        </div>
        <button type="button" className="btn btn--ghost btn--block" style={{ marginTop: 16 }} onClick={logout}>
          <LogOut size={18} /> Log out
        </button>
      </Modal>

      <GymMascot />
    </div>
  )
}
