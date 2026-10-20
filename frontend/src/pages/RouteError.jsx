import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function RouteError({ error, reset }) {
  const router = useRouter()
  const retry = () => {
    reset?.()
    router.invalidate()
  }
  return (
    <div className="page" style={{ maxWidth: 640, minHeight: '70dvh', justifyContent: 'center' }}>
      <div className="card card--red stack" style={{ alignItems: 'flex-start' }}>
        <span className="icon-tile icon-tile--red icon-tile--lg"><AlertTriangle size={26} /></span>
        <h1 style={{ fontSize: '1.6rem' }}>This screen took a hit</h1>
        <p className="muted">{error?.message || 'Something went wrong while loading this page.'}</p>
        <div className="row-wrap">
          <button type="button" className="btn btn--primary" onClick={retry}><RotateCcw size={18} /> Try again</button>
          <Link to="/dashboard" className="btn btn--ghost">Back to Home Base</Link>
        </div>
      </div>
    </div>
  )
}
