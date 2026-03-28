import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Brain,
  Sparkles,
  Send,
  BarChart4,
  Trash2,
  Scale,
  Lightbulb,
  Zap,
  Activity,
  ArrowRight,
  FileText,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Heart,
  Database
} from 'lucide-react'
import { sendChatMessage, analyzeMedicalReport, fetchProfile, getCurrentUser } from '../services/api'

function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#60a5fa' }
  if (bmi < 25) return { label: 'Normal', color: '#4ade80' }
  if (bmi < 30) return { label: 'Overweight', color: '#fb923c' }
  return { label: 'Obese', color: '#f87171' }
}

export default function AIChat() {
  const [chatHistory, setChatHistory] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveHistory, setSaveHistory] = useState(true)
  const chatEndRef = useRef(null)

  // Medical RAG State
  const [reportFile, setReportFile] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportAnalysis, setReportAnalysis] = useState(null)
  const [reportError, setReportError] = useState('')
  const fileInputRef = useRef(null)

  // Profile / BMI state
  const [profileData, setProfileData] = useState(null)
  const bmi = useMemo(() => {
    if (!profileData?.weight) return null
    return Math.round((profileData.weight / (1.70 * 1.70)) * 10) / 10
  }, [profileData])
  const bmiCategory = useMemo(() => bmi ? getBMICategory(bmi) : null, [bmi])

  useEffect(() => {
    const saved = localStorage.getItem('arize_ai_history')
    if (saved) {
      try { setChatHistory(JSON.parse(saved)) } catch (e) { }
    }
    // Load profile for BMI widget
    fetchProfile().then(p => setProfileData(p)).catch(() => { })
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleReportUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setReportFile(file)
    setReportLoading(true)
    setReportError('')

    try {
      const result = await analyzeMedicalReport(file)
      setReportAnalysis(result)

      const newEntry = {
        id: Date.now(),
        question: `📋 Uploaded medical report: ${file.name}`,
        answer: result.summary || "I've analyzed your medical report and saved the health insights to your profile. This data will now be used to personalize all future AI coaching responses. What would you like to know about your health?",
        source: 'medical_rag',
        timestamp: new Date().toLocaleTimeString()
      }
      const next = [...chatHistory, newEntry]
      setChatHistory(next)
      if (saveHistory) localStorage.setItem('arize_ai_history', JSON.stringify(next))
    } catch (err) {
      setReportError('Failed to process report. Ensure it is a valid document.')
    } finally {
      setReportLoading(false)
    }
  }

  const askAi = async () => {
    if (!question.trim()) return
    setLoading(true)
    const userQ = question
    setQuestion('')

    try {
      const result = await sendChatMessage(userQ)
      const newEntry = {
        id: Date.now(),
        question: userQ,
        answer: result.answer,
        source: result.source || 'groq_ai',
        timestamp: new Date().toLocaleTimeString()
      }
      const nextHistory = [...chatHistory, newEntry]
      setChatHistory(nextHistory)
      if (saveHistory) localStorage.setItem('arize_ai_history', JSON.stringify(nextHistory))
    } catch (error) {
      const errorEntry = {
        id: Date.now(),
        question: userQ,
        answer: 'AI service is temporarily unavailable. Please check your connection and try again.',
        source: 'error',
        timestamp: new Date().toLocaleTimeString()
      }
      setChatHistory([...chatHistory, errorEntry])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    if (window.confirm('Clear chat history?')) {
      setChatHistory([])
      localStorage.removeItem('arize_ai_history')
    }
  }

  const quickPrompts = [
    'What should I eat for muscle gain?',
    'How can I improve my sleep?',
    'Create a recovery plan for me',
    'Analyze my current health status',
  ]

  return (
    <motion.div
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>AI Coach</h1>
        <p className="text-muted">RAG-powered intelligence with memory — personalized to your health data and history.</p>
      </div>

      {/* Left Column: Chat */}
      <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '650px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sparkles size={18} />
              <h3 style={{ fontSize: '1.125rem' }}>Direct Consultation</h3>
              {chatHistory.length > 0 && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', background: 'rgba(var(--accent-rgb, 255,255,255),0.1)', borderRadius: '99px', color: 'var(--accent)' }}>
                  <Database size={10} style={{ display: 'inline', marginRight: 3 }} />
                  Memory Active
                </span>
              )}
            </div>
            {chatHistory.length > 0 && (
              <button onClick={clearHistory} className="text-muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={14} /> Clear History
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem', paddingRight: '1rem' }}>
            {chatHistory.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: 0.5 }}>
                <Bot size={48} strokeWidth={1} />
                <p>Your AI health doctor is ready. Ask me anything.</p>
                <p style={{ fontSize: '0.75rem', textAlign: 'center', maxWidth: '300px' }}>I remember our previous conversations and use your health data to give personalized advice.</p>
              </div>
            ) : (
              chatHistory.map((entry) => (
                <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', minWidth: '60px' }}>You</div>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{entry.question}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', minWidth: '60px', color: 'var(--accent)' }}>
                      {entry.source === 'medical_rag' ? '🩺 Doc' : 'AI'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{entry.answer}</div>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.5 }}>
                        {entry.source === 'medical_rag' ? 'Medical Intelligence' : `Source: ${entry.source}`} • {entry.timestamp}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          {chatHistory.length === 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {quickPrompts.map(p => (
                <button
                  key={p}
                  onClick={() => setQuestion(p)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: '99px', color: 'var(--text-secondary)', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askAi())}
              placeholder="Ask anything about your health, workouts, nutrition..."
              style={{
                width: '100%',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem 4rem 1rem 1rem',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                minHeight: '60px',
                resize: 'none'
              }}
            />
            <button
              onClick={askAi}
              disabled={loading || !question.trim()}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: loading ? 'var(--text-secondary)' : 'var(--accent)'
              }}
            >
              {loading ? <Loader2 className="spinner" size={18} /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: BMI + Medical */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* BMI Card (replaces Readiness Score) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Scale size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1.125rem' }}>Your BMI</h3>
          </div>
          {bmi ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: bmiCategory?.color, lineHeight: 1 }}>{bmi}</div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: bmiCategory?.color }}>{bmiCategory?.label}</div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>kg/m²</div>
                </div>
              </div>
              {/* Gradient BMI bar */}
              <div style={{ position: 'relative', height: '8px', background: 'linear-gradient(to right, #60a5fa 0%, #4ade80 37%, #fb923c 62%, #f87171 80%)', borderRadius: '4px', marginBottom: '0.5rem' }}>
                <div style={{
                  position: 'absolute', top: '-4px',
                  left: `${Math.min(Math.max(((bmi - 10) / 30) * 100, 3), 97)}%`,
                  width: '16px', height: '16px',
                  background: bmiCategory?.color, borderRadius: '50%',
                  border: '2px solid var(--bg)', transform: 'translateX(-50%)'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', opacity: 0.5, marginBottom: '1rem' }}>
                <span>10</span><span>18.5</span><span>25</span><span>30</span><span>40+</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Underweight', range: '< 18.5', color: '#60a5fa' },
                  { label: 'Normal', range: '18.5–25', color: '#4ade80' },
                  { label: 'Overweight', range: '25–30', color: '#fb923c' },
                  { label: 'Obese', range: '> 30', color: '#f87171' },
                ].map(cat => (
                  <div key={cat.label} style={{ padding: '0.6rem', borderRadius: 'var(--radius)', background: bmiCategory?.label === cat.label ? `${cat.color}20` : 'var(--surface-hover)', border: `1px solid ${bmiCategory?.label === cat.label ? cat.color : 'transparent'}` }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: cat.color }}>{cat.label}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{cat.range}</div>
                  </div>
                ))}
              </div>
              <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: '0.75rem' }}>
                Based on {profileData?.weight}kg · 170cm
              </div>
            </>
          ) : (
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                Update your profile with weight to see your BMI health status.
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                {[
                  { label: 'Normal', range: '18.5–25', color: '#4ade80' },
                  { label: 'Overweight', range: '25–30', color: '#fb923c' },
                ].map(cat => (
                  <div key={cat.label} style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cat.color }}>{cat.label}</span>
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>{cat.range}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Medical Intelligence */}
        <div className="card" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, var(--surface) 0%, rgba(255,255,255,0.02) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Heart size={18} style={{ color: '#f87171' }} />
            <h3 style={{ fontSize: '1.125rem' }}>Medical Intelligence</h3>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Upload your medical reports (blood tests, scans, prescriptions). The AI doctor will analyze them and use this data in all future coaching responses.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleReportUpload}
            style={{ display: 'none' }}
            accept=".pdf,image/*"
          />

          {!reportFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                border: '1px dashed rgba(248,113,113,0.4)',
                padding: '1.25rem',
                borderRadius: 'var(--radius)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(248,113,113,0.05)',
                cursor: 'pointer',
                color: '#f87171',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={20} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Upload Medical Report</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>PDF, JPG, PNG accepted</span>
            </button>
          ) : (
            <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {reportLoading ? <Loader2 className="spinner" size={16} style={{ color: '#f87171' }} /> : <CheckCircle2 size={16} color="#4ade80" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {reportFile.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    {reportLoading ? 'Analyzing health data...' : '✓ Saved to AI memory — all future responses use this data'}
                  </div>
                </div>
                {!reportLoading && (
                  <button onClick={() => { setReportFile(null); setReportAnalysis(null); }} className="text-muted">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {reportError && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius)', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={14} /> {reportError}
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
            <ShieldCheck size={14} style={{ color: '#4ade80', flexShrink: 0 }} />
            <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Data stored securely · Used only for your personalized AI responses</span>
          </div>
        </div>

        {/* AI Health context indicator */}
        <div className="card" style={{ background: 'var(--surface-hover)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Brain size={16} className="text-muted" />
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Memory Status</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Chat History', active: chatHistory.length > 0, count: chatHistory.length },
              { label: 'Medical Reports', active: !!reportAnalysis, count: reportFile ? 1 : 0 },
              { label: 'Health Profile', active: !!profileData?.weight, count: profileData?.weight ? 1 : 0 },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '4px', background: item.active ? 'rgba(var(--accent-rgb, 255,255,255),0.05)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.active ? '#4ade80' : 'var(--border)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.label}</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: item.active ? '#4ade80' : 'var(--text-secondary)' }}>
                  {item.active ? `${item.count} loaded` : 'Empty'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
