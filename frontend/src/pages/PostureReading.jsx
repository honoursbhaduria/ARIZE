import { Link, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react'
import { postureArticleQuery } from '../lib/queries'
import { Alert, Card, PageHeader, Skeleton } from '../ui/components'

export default function PostureReading() {
  const { topic } = useSearch({ from: '/app/posture-reading' })
  const article = useQuery(postureArticleQuery(topic))

  return (
    <div className="page">
      <PageHeader
        eyebrow="Form library"
        title={topic}
        subtitle="Technique notes sourced from Wikipedia."
        action={<Link to="/vision" className="btn btn--ghost"><ArrowLeft size={18} /> Vision Lab</Link>}
      />

      {article.isLoading && (
        <Card className="stack"><Skeleton height={24} width="40%" /><Skeleton height={14} /><Skeleton height={14} /><Skeleton height={14} width="80%" /></Card>
      )}
      {article.isError && <Alert tone="error">{article.error.message}</Alert>}

      {article.data && (
        <div className="split">
          <Card>
            <h2 className="card-title" style={{ marginBottom: 14 }}><BookOpen size={20} className="gold" /> {article.data.topic}</h2>
            <p className="muted" style={{ whiteSpace: 'pre-line', lineHeight: 1.75 }}>{article.data.extract}</p>
          </Card>
          <Card flush>
            {article.data.thumbnail ? (
              <img src={article.data.thumbnail} alt={article.data.topic} style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />
            ) : (
              <p className="small muted" style={{ padding: 20 }}>No image available</p>
            )}
            <div className="stack-sm" style={{ padding: 20 }}>
              <span className="eyebrow">Source</span>
              {article.data.pageUrl ? (
                <a href={article.data.pageUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--block">
                  Open on Wikipedia <ExternalLink size={16} />
                </a>
              ) : (
                <span className="small muted">Wikipedia URL unavailable</span>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
