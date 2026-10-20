import { Link } from '@tanstack/react-router'

// Gold wordmark with the stone texture inside the letters (see .logo in theme.css).
export default function Logo({ size = 'md', to = '/', className = '' }) {
  return (
    <Link to={to} className={`logo logo--${size} ${className}`} aria-label="ARIZE home">
      ARIZE
    </Link>
  )
}
