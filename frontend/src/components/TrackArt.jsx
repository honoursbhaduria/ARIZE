import { useState } from 'react'
import { Music } from 'lucide-react'

// Track artwork with a music-note fallback when the image is missing or fails to load.
export default function TrackArt({ src, className, iconSize = 16 }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <span className={className} style={{ display: 'grid', placeItems: 'center', background: 'var(--gold-ink)', color: 'var(--gold)' }}><Music size={iconSize} /></span>
  }
  return <img src={src} alt="" className={className} onError={() => setFailed(true)} />
}
