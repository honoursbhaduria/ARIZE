import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Brain, Sparkles, Send, BarChart4 } from 'lucide-react'
import { sendChatMessage } from '../services/api'
import './FeaturePages.css'

export default function AIChat() {
  const [question, setQuestion] = useState('Give me veg high-protein diet for muscle gain')
  const [answer, setAnswer] = useState('Your plan should target 120-140g protein with paneer, tofu, curd, lentils, and soy chunks.')
  const [loading, setLoading] = useState(false)

  const askAi = async () => {
    if (!question.trim()) return
    setLoading(true)
    try {
      const result = await sendChatMessage(question)
      setAnswer(result.answer)
    } catch {
      setAnswer('AI service is unavailable. Please check backend env/API keys and try again.')
    } finally {
      setLoading(false)
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

        <article className="feature-card glass">
          <h3><Sparkles size={16} /> Ask BeastTrack AI</h3>
          <div className="inline-form">
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
            <button className="btn-primary" type="button" onClick={askAi} disabled={loading}>
              {loading ? 'Thinking...' : 'Ask AI'} <Send size={14} />
            </button>
          </div>
          <p><strong>AI:</strong> {answer}</p>
        </article>
      </section>
    </motion.div>
  )
}
