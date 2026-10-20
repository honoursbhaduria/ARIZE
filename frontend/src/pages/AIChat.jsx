import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot, Brain, CheckCircle2, Database, Heart, Send, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { analyzeMedicalReport, sendChatMessage } from '../services/api'
import { profileQuery } from '../lib/queries'
import BmiCard from '../components/BmiCard'
import { Alert, Badge, Button, Card, CardHeader, PageHeader } from '../ui/components'
import { ConfirmDialog } from '../ui/Modal'

const HISTORY_KEY = 'arize_ai_history'

const QUICK_PROMPTS = [
  'What should I eat for muscle gain?',
  'How can I improve my sleep?',
  'Create a recovery plan for me',
  'Analyze my current health status',
]

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function AIChat() {
  const profile = useQuery(profileQuery)
  const [history, setHistory] = useState(loadHistory)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [reportFile, setReportFile] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportAnalysis, setReportAnalysis] = useState(null)
  const [reportError, setReportError] = useState('')
  const logRef = useRef(null)
  const fileInputRef = useRef(null)

  // Persist real answers; transient error entries stay in this session only.
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter((entry) => entry.source !== 'error')))
    } catch {
      // ignore quota errors
    }
  }, [history])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' })
  }, [history, loading])

  const append = (entry) => setHistory((current) => [...current, { id: `${Date.now()}-${Math.random()}`, timestamp: now(), ...entry }])

  const askAi = async (text = question) => {
    const userQ = text.trim()
    if (!userQ || loading) return
    setQuestion('')
    setLoading(true)
    try {
      const result = await sendChatMessage(userQ)
      append({ question: userQ, answer: result.answer, source: result.source || 'groq_ai' })
    } catch {
      append({ question: userQ, answer: 'AI service is temporarily unavailable. Please check your connection and try again.', source: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleReportUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReportFile(file)
    setReportLoading(true)
    setReportError('')
    try {
      const result = await analyzeMedicalReport(file)
      setReportAnalysis(result)
      append({
        question: `📋 Uploaded medical report: ${file.name}`,
        answer: result.summary || "I've analysed your medical report and saved the insights to your profile. Future coaching will use this data. What would you like to know?",
        source: 'medical_rag',
      })
    } catch {
      setReportError('Failed to process report. Make sure it is a valid PDF or image.')
      setReportFile(null)
    } finally {
      setReportLoading(false)
    }
  }

  const memoryItems = [
    { label: 'Chat history', active: history.length > 0, count: history.length },
    { label: 'Medical reports', active: !!reportAnalysis, count: reportAnalysis ? 1 : 0 },
    { label: 'Health profile', active: !!profile.data?.weight, count: profile.data?.weight ? 1 : 0 },
  ]

  return (
    <div className="page">
      <PageHeader eyebrow="Personal trainer" title="AI Coach" subtitle="Ask anything about training, food, sleep or recovery. Answers use your profile and history." />

      <div className="split">
        <Card className="stack" style={{ height: 'min(720px, calc(100dvh - 210px))', minHeight: 460, gap: 14 }}>
          <div className="spread">
            <div className="row">
              <span className="icon-tile icon-tile--violet"><Bot size={20} /></span>
              <h3 className="card-title">Coach chat</h3>
              {history.length > 0 && <Badge tone="violet" icon={Database}>Memory on</Badge>}
            </div>
            {history.length > 0 && (
              <button type="button" className="icon-btn icon-btn--danger" onClick={() => setConfirmClear(true)} aria-label="Clear chat history">
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="chat-log grow" ref={logRef} aria-live="polite">
            {history.length === 0 && !loading ? (
              <div className="empty" style={{ margin: 'auto' }}>
                <Bot size={44} strokeWidth={1.5} />
                <h3 style={{ color: 'var(--text)' }}>Your coach is ready</h3>
                <p className="small" style={{ maxWidth: '36ch' }}>I remember our conversations and use your health data for personalised advice.</p>
              </div>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="stack-sm" style={{ gap: 10 }}>
                  <div className="bubble bubble--user">{entry.question}</div>
                  <div className={`bubble ${entry.source === 'error' ? 'bubble--error' : 'bubble--ai'}`}>
                    {entry.answer}
                    <div className="bubble__meta">
                      {entry.source === 'medical_rag' ? '🩺 Medical intelligence' : entry.source === 'error' ? 'Error' : 'AI Coach'} · {entry.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="bubble bubble--ai row" style={{ gap: 10 }}>
                <span className="spinner" /> Thinking…
              </div>
            )}
          </div>

          {history.length === 0 && (
            <div className="row-wrap">
              {QUICK_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" className="chip" onClick={() => askAi(prompt)}>{prompt}</button>
              ))}
            </div>
          )}

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault()
              askAi()
            }}
          >
            <textarea
              className="textarea"
              rows={1}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  askAi()
                }
              }}
              placeholder="Ask about workouts, nutrition, sleep…"
              aria-label="Message the AI coach"
            />
            <Button type="submit" variant="primary" icon={Send} loading={loading} disabled={!question.trim()} aria-label="Send" />
          </form>
        </Card>

        <div className="stack">
          <BmiCard weight={profile.data?.weight} showCategories />

          <Card tone="red">
            <CardHeader icon={Heart} tone="red" title="Medical intelligence" />
            <p className="small muted" style={{ marginBottom: 14 }}>
              Upload blood tests, scans or prescriptions. The coach analyses them and uses the insights in future answers.
            </p>
            <input ref={fileInputRef} type="file" accept=".pdf,image/*" hidden onChange={handleReportUpload} />
            {reportFile ? (
              <div className="list-row">
                {reportLoading ? <span className="spinner" /> : <CheckCircle2 size={18} className="green" />}
                <div className="grow">
                  <div className="truncate" style={{ fontWeight: 700 }}>{reportFile.name}</div>
                  <div className="tiny muted">{reportLoading ? 'Analysing health data…' : 'Saved to AI memory'}</div>
                </div>
                {!reportLoading && (
                  <button type="button" className="icon-btn" onClick={() => { setReportFile(null); setReportAnalysis(null) }} aria-label="Remove report">
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <button type="button" className="dropzone" onClick={() => fileInputRef.current?.click()}>
                <Upload size={26} />
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>Upload medical report</span>
                <span className="tiny">PDF, JPG or PNG</span>
              </button>
            )}
            {reportError && <div style={{ marginTop: 10 }}><Alert tone="error">{reportError}</Alert></div>}
            <p className="tiny muted row" style={{ marginTop: 12 }}><ShieldCheck size={14} className="green" /> Used only for your personalised coaching.</p>
          </Card>

          <Card>
            <CardHeader icon={Brain} tone="violet" title="Coach memory" />
            <ul className="list">
              {memoryItems.map((item) => (
                <li key={item.label} className="list-row spread" style={{ padding: '10px 12px' }}>
                  <span className="row small" style={{ gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.active ? 'var(--green)' : 'var(--border-strong)' }} />
                    {item.label}
                  </span>
                  <span className={`tiny mono ${item.active ? 'green' : 'dim'}`}>{item.active ? `${item.count} loaded` : 'Empty'}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear chat history?"
        message="Your coach will forget this conversation. This can’t be undone."
        confirmLabel="Clear history"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setHistory([])
          localStorage.removeItem(HISTORY_KEY)
          setConfirmClear(false)
        }}
      />
    </div>
  )
}
