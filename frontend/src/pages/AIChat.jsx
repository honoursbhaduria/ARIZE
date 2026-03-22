import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bot, 
  Brain, 
  Sparkles, 
  Send, 
  BarChart4, 
  Trash2, 
  History,
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
  X
} from 'lucide-react'
import { sendChatMessage, getWorkoutRecommendation, analyzeMedicalReport, getCurrentUser } from '../services/api'

export default function AIChat() {
  const [chatHistory, setChatHistory] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveHistory, setSaveHistory] = useState(true)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  
  // Medical RAG State
  const [reportFile, setReportFile] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportAnalysis, setReportAnalysis] = useState(null)
  const [reportError, setReportError] = useState('')
  const fileInputRef = useRef(null)

  const [inputs, setInputs] = useState({
    sleep_hours: 7,
    fatigue: 50,
    performance: 70,
    streak: 3,
  })
  const [recommendationData, setRecommendationData] = useState({
    readiness_percent: 72,
    mode: 'light',
    sleep_quality: 'moderate',
    streak_trend: 'stable',
    action: '35 min light + mobility',
    source: 'initial'
  })

  useEffect(() => {
    const saved = localStorage.getItem('arize_ai_history')
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved))
      } catch (e) {}
    }
    loadRecommendation()
  }, [])

  const loadRecommendation = async () => {
    setRecommendationLoading(true)
    try {
      const result = await getWorkoutRecommendation(inputs)
      setRecommendationData(result)
    } catch (error) {}
    finally {
      setRecommendationLoading(false)
    }
  }

  const handleReportUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setReportFile(file)
    setReportLoading(true)
    setReportError('')
    
    try {
      const result = await analyzeMedicalReport(file)
      setReportAnalysis(result)
      
      // Automatically add a chat message about the report
      const newEntry = {
        id: Date.now(),
        question: `Analyzed medical report: ${file.name}`,
        answer: result.summary || "I've processed your medical report. I'll now factor these health insights into our coaching sessions. What would you like to know about your personalized routine?",
        source: 'medical_rag',
        timestamp: new Date().toLocaleTimeString()
      }
      setChatHistory(prev => [...prev, newEntry])
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
      if (saveHistory) {
        localStorage.setItem('arize_ai_history', JSON.stringify(nextHistory))
      }
    } catch (error) {
      const errorEntry = {
        id: Date.now(),
        question: userQ,
        answer: 'AI service is unavailable. Please check backend settings.',
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
    'Why am I not improving?',
    'What should I do today?',
    'Meal plan for muscle gain',
  ]

  return (
    <motion.div 
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>AI Coach</h1>
        <p className="text-muted">Personalized intelligence factored by your health data and reports.</p>
      </div>

      {/* Left Column: Chat */}
      <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '650px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sparkles size={18} />
              <h3 style={{ fontSize: '1.125rem' }}>Direct Consultation</h3>
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
                <p>Start a conversation with your AI coach.</p>
              </div>
            ) : (
              chatHistory.map((entry) => (
                <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', minWidth: '60px' }}>You</div>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{entry.question}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', minWidth: '60px', color: 'var(--accent)' }}>AI</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{entry.answer}</div>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.5 }}>Source: {entry.source} • {entry.timestamp}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askAi())}
              placeholder="Ask anything..."
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

      {/* Right Column: Knowledge & Medical RAG */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Medical Report RAG Section */}
        <div className="card" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, var(--surface) 0%, rgba(255,255,255,0.02) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <FileText size={18} style={{ color: '#ffffff' }} />
            <h3 style={{ fontSize: '1.125rem', color: '#ffffff' }}>Medical Intelligence</h3>
          </div>
          
          <p style={{ fontSize: '0.815rem', color: '#ffffff', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            Upload medical reports (PDF/IMG) to factor your health history into AI coaching routines.
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
                border: '1px dashed var(--border)', 
                padding: '1.5rem', 
                borderRadius: 'var(--radius)', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '0.75rem',
                background: 'var(--surface-hover)',
                cursor: 'pointer',
                color: '#ffffff'
              }}
            >
              <Upload size={20} style={{ color: '#ffffff' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Upload Report</span>
            </button>
          ) : (
            <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {reportLoading ? <Loader2 className="spinner" size={16} style={{ color: '#ffffff' }} /> : <CheckCircle2 size={16} color="#4ade80" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#ffffff' }}>
                    {reportFile.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
                    {reportLoading ? 'Extracting health data...' : 'Report fact-checked & synced'}
                  </div>
                </div>
                {!reportLoading && (
                  <button onClick={() => { setReportFile(null); setReportAnalysis(null); }} style={{ color: '#ffffff' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
            <ShieldCheck size={14} style={{ color: '#ffffff' }} />
            <span style={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 600 }}>HIPAA Compliant Data Handling</span>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }} className="text-muted">
            Quick Prompts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {quickPrompts.map(p => (
              <button 
                key={p} 
                onClick={() => setQuestion(p)}
                style={{ 
                  textAlign: 'left', 
                  fontSize: '0.875rem', 
                  padding: '0.75rem', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)',
                  transition: 'background 0.2s ease',
                  color: '#ffffff'
                }}
                onMouseEnter={e => e.target.style.background = 'var(--surface-hover)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Readiness Model */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Zap size={18} className="text-muted" />
            <h3 style={{ fontSize: '1.125rem' }}>Readiness Score</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{Math.round(recommendationData.readiness_percent)}%</div>
              <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
                <div style={{ width: `${recommendationData.readiness_percent}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)' }}>
                <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Intensity</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'capitalize' }}>{recommendationData.mode}</div>
              </div>
              <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)' }}>
                <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Trend</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'capitalize' }}>{recommendationData.streak_trend}</div>
              </div>
            </div>

            <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Lightbulb size={14} className="text-muted" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Daily Action</span>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{recommendationData.action}</p>
            </div>

            <button 
              onClick={loadRecommendation}
              disabled={recommendationLoading}
              className="btn-secondary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <History size={14} /> {recommendationLoading ? 'Recalculating...' : 'Recalculate Score'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
