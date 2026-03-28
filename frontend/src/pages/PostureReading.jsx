import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, BookOpen } from 'lucide-react'
import { getPostureReadingContent } from '../services/wikipediaApi'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function PostureReading() {
  const query = useQuery()
  const topic = query.get('topic') || 'Squat'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [article, setArticle] = useState(null)

  useEffect(() => {
    let mounted = true

    async function loadArticle() {
      setLoading(true)
      setError('')
      const data = await getPostureReadingContent(topic)
      if (!mounted) return

      if (!data) {
        setError('Could not load posture content from Wikipedia.')
        setArticle(null)
      } else {
        setArticle(data)
      }
      setLoading(false)
    }

    loadArticle()
    return () => {
      mounted = false
    }
  }, [topic])

  return (
    <motion.div className="grid-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>Posture Reading</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Detailed reading sourced from Wikipedia API.</p>
        </div>
        <Link to="/vision" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Back to AI Body Tracking
        </Link>
      </div>

      <div className="card" style={{ gridColumn: 'span 12' }}>
        {loading && <div style={{ padding: '2rem', textAlign: 'center' }}>Loading posture article...</div>}
        {!loading && error && <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>{error}</div>}

        {!loading && !error && article && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <BookOpen size={18} />
                <h2 style={{ fontSize: '1.3rem' }}>{article.topic}</h2>
              </div>
              <p style={{ whiteSpace: 'pre-line', lineHeight: 1.7, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {article.extract}
              </p>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', height: 'fit-content' }}>
              {article.thumbnail ? (
                <img src={article.thumbnail} alt={article.topic} style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ padding: '1rem', fontSize: '0.85rem' }} className="text-muted">No image available</div>
              )}
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7 }}>Source</div>
                {article.pageUrl ? (
                  <a href={article.pageUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Open on Wikipedia <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Wikipedia URL unavailable</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
