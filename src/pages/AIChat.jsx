import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Brain, Sparkles, Send, BarChart4, Trash2, Save } from 'lucide-react'
import { sendChatMessage } from '../services/api'
import './FeaturePages.css'

export default function AIChat() {
  const [chatHistory, setChatHistory] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveHistory, setSaveHistory] = useState(false)

  const askAi = async () => {
    if (!question.trim()) return
    setLoading(true)

    try {
      const result = await sendChatMessage(question)
      const newEntry = {
        id: Date.now(),
        question,
        answer: result.answer,
        source: result.source || 'groq_ai',
        timestamp: new Date().toLocaleTimeString()
      }
      setChatHistory([...chatHistory, newEntry])
      setQuestion('')
    } catch (error) {
      const errorEntry = {
        id: Date.now(),
        question,
        answer: 'AI service is unavailable. Please check backend env/API keys and try again.',
        source: 'error',
        timestamp: new Date().toLocaleTimeString()
      }
      setChatHistory([...chatHistory, errorEntry])
      setQuestion('')
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    if (window.confirm('Clear chat history?')) {
      setChatHistory([])
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      askAi()
    }
  }

  return (
    <motion.div
      className="page-container feature-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <section className="feature-hero glass">
        <div className="feature-badge"><Brain size={14} /> RAG Personal Intelligence Layer</div>
        <h1>AI Chatbot + Recommendation Engine</h1>
        <p>Personalized answers using workout, sleep, food history + embeddings + daily readiness scoring.</p>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass">
          <h3><Bot size={16} /> Smart Answers</h3>
          <ul className="feature-list">
            <li>Why am I not improving?</li>
            <li>What should I do today?</li>
            <li>Give me a vegetarian high-protein meal plan</li>
          </ul>
          <small>RAG context: workout logs + nutrition + sleep + streak + recent fatigue.</small>
        </article>

        <article className="feature-card glass">
          <h3><BarChart4 size={16} /> AI Workout Recommendation (Gymnasium)</h3>
          <div className="feature-stats">
            <div className="stat-box"><strong>Readiness: 72%</strong><small>Sleep + fatigue model</small></div>
            <div className="stat-box"><strong>Mode: Light</strong><small>Auto-selected intensity</small></div>
          </div>
          <ul className="feature-list">
            <li>Sleep quality: moderate</li>
            <li>Streak trend: stable</li>
            <li>Action: 35 min light + mobility</li>
          </ul>
        </article>

        <article className="feature-card glass" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}><Sparkles size={16} style={{ marginRight: '8px' }} /> Ask BeastTrack AI</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.7 }}>
                <input
                  type="checkbox"
                  checked={saveHistory}
                  onChange={(e) => setSaveHistory(e.target.checked)}
                />
                Save History
              </label>
              {chatHistory.length > 0 && (
                <button
                  className="btn-primary btn-secondary"
                  onClick={clearHistory}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {chatHistory.map((entry) => (
                <div key={entry.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(100, 116, 139, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ color: '#60a5fa', fontSize: '13px' }}>You:</strong>
                    <span style={{ fontSize: '11px', opacity: 0.6 }}>{entry.timestamp}</span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '13px', opacity: 0.85 }}>{entry.question}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', marginBottom: '4px' }}>
                    <strong style={{ color: '#10b981', fontSize: '13px' }}>BeastTrack AI:</strong>
                    <span style={{ fontSize: '10px', opacity: 0.5, fontStyle: 'italic' }}>{entry.source === 'groq_ai' ? '🤖 Groq' : entry.source}</span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '13px', opacity: 0.9, lineHeight: '1.4' }}>{entry.answer}</p>
                </div>
              ))}
            </div>
          )}

          {/* Input Form */}
          <div className="inline-form">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about your fitness... (Ctrl+Enter to send)"
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
            <button className="btn-primary" type="button" onClick={askAi} disabled={loading}>
              {loading ? 'Thinking...' : 'Ask AI'} <Send size={14} />
            </button>
          </div>

          {/* Empty State */}
          {chatHistory.length === 0 && (
            <p style={{ textAlign: 'center', opacity: 0.6, fontSize: '14px', marginTop: '16px' }}>
              No conversations yet. Start by asking BeastTrack AI a question!
            </p>
          )}
        </article>
      </section>
    </motion.div>
  )
}
