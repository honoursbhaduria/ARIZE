import { Link } from '@tanstack/react-router'
import { ArrowLeft, Compass, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="page" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center', textAlign: 'center', maxWidth: 520 }}>
      <span className="icon-tile icon-tile--violet icon-tile--lg"><Compass size={28} /></span>
      <div className="eyebrow gold">Error 404</div>
      <h1 style={{ fontSize: 'clamp(2.2rem, 8vw, 3.4rem)' }}>You wandered off the map</h1>
      <p className="muted">This area of the gym doesn't exist. Head back to base and keep your streak alive.</p>
      <div className="stack" style={{ width: '100%', maxWidth: 320 }}>
        <Link to="/dashboard" className="btn btn--primary btn--lg btn--block"><Home size={18} /> Return to Home Base</Link>
        <button type="button" className="btn btn--ghost btn--block" onClick={() => window.history.back()}><ArrowLeft size={18} /> Go back</button>
      </div>
    </div>
  )
}
