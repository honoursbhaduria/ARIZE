import { Link } from '@tanstack/react-router'
import { ArrowLeft, Dumbbell, Flame, Sparkles, Trophy } from 'lucide-react'
import { Badge } from '../ui/components'
import '../styles/auth.css'

export default function AuthLayout({ headline, children }) {
  return (
    <div className="auth">
      <div className="auth__form-side">
        <div className="auth__top">
          <Link to="/" className="brand">
            <span className="brand__mark"><Dumbbell size={18} strokeWidth={2.6} /></span>
            ARIZE
          </Link>
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
            <Badge tone="violet" icon={Sparkles}>XP every rep</Badge>
            <Badge tone="green" icon={Trophy}>Leaderboards</Badge>
          </div>
          <h2>{headline}</h2>
        </div>
      </div>
    </div>
  )
}
