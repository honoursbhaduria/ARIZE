import { useMemo } from 'react'
import './CircularGallery.css'

export default function CircularGallery({
  items,
  bend = 3,
  textColor = '#2f6fb2',
  borderRadius = 0.05,
  font = '600 14px Sora',
  scrollSpeed = 2,
  scrollEase = 0.05,
}) {
  const list = useMemo(() => {
    const fallback = [
      { image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80', text: 'AI Feedback' },
      { image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80', text: 'Smart Plans' },
      { image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', text: 'Recovery' },
      { image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80', text: 'Posture' },
      { image: 'https://images.unsplash.com/photo-1549476464-37392f717541?auto=format&fit=crop&w=1200&q=80', text: 'Consistency' },
    ]
    return items && items.length ? items : fallback
  }, [items])

  const duplicated = [...list, ...list]

  return (
    <div className="circular-gallery" style={{ ['--gallery-accent']: textColor }}>
      <div className="circular-gallery-track" style={{ ['--gallery-speed']: `${Math.max(12, 26 - scrollSpeed * 3)}s` }}>
        {duplicated.map((item, index) => (
          <article
            key={`${item.text}-${index}`}
            className="circular-gallery-card"
            style={{ borderRadius: `${Math.max(6, Math.round(borderRadius * 100))}px` }}
          >
            <img
              src={item.image}
              alt={item.text}
              className="circular-gallery-image"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = 'https://images.unsplash.com/photo-1521804906057-1df8fdb718b7?auto=format&fit=crop&w=1200&q=80'
              }}
            />
            <p style={{ color: textColor, font: font }}>{item.text}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
