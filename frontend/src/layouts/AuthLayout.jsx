import { Link } from '@tanstack/react-router'
import { ArrowLeft, Flame, Star, Trophy } from 'lucide-react'
import { Badge } from '../ui/components'
import Logo from '../components/Logo'
import '../styles/auth.css'

export default function AuthLayout({ headline, children }) {
  return (
    <div className="auth">
      <div className="auth__form-side">
        <div className="auth__top">
          <Logo size="md" />
          <Link to="/" className="link small" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={16} /> Home
          </Link>
        </div>
        <div className="auth__panel page" style={{ padding: '32px 0 0', maxWidth: 420 }}>
          {children}
        </div>
      </div>
      <div className="auth__visual" aria-hidden="true">
        <video src="/login-bg.mp4" poster="/image.png" autoPlay loop muted playsInline />
        <div className="auth__visual-content">
          <div className="row-wrap">
            <Badge tone="gold" icon={Flame}>Daily streaks</Badge>
            <Badge tone="violet" icon={Star}>XP every rep</Badge>
            <Badge tone="green" icon={Trophy}>Leaderboards</Badge>
          </div>
          <h2>{headline}</h2>
        </div>
      </div>
    </div>
  )
}
