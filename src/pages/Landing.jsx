import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Bot, Dumbbell, Salad, Flame, Watch, Brain, MessageCircle, Bell, Camera } from 'lucide-react'
import './FeaturePages.css'

export default function Landing() {
  return (
    <motion.div
      className="page-container feature-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <section className="feature-hero glass">
        <div className="feature-badge">MVP Frontend + Django API Ready</div>
        <h1>BeastTrack AI Fitness Platform</h1>
        <p>
          Full product structure for user system, CV workout tracking, nutrition AI, RAG intelligence,
          integrations, streaks, analytics, and chatbot experience.
        </p>
        <div className="tag-row">
          <span className="tag">React Frontend</span>
          <span className="tag">Django REST Backend</span>
          <span className="tag">MediaPipe + OpenCV Ready</span>
          <span className="tag">JWT Security Ready</span>
        </div>
        <div className="tag-row">
          <Link className="btn-primary" to="/counter"><Camera size={14} /> Open Live Rep Counter</Link>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass">
          <Bot size={18} />
          <h3>AI Brain & Chatbot</h3>
          <p>Personalized answers powered by user history + embeddings + recommendation engine.</p>
          <Link className="btn-primary" to="/chat">Open AI Brain</Link>
        </article>

        <article className="feature-card glass">
          <Dumbbell size={18} />
          <h3>Workout Tracking</h3>
          <p>Real-time rep counting, exercise detection, form tracking, and session summaries.</p>
          <Link className="btn-primary" to="/vision">Open Workout AI</Link>
        </article>

        <article className="feature-card glass">
          <Salad size={18} />
          <h3>Nutrition & Food AI</h3>
          <p>Image upload + nutrition estimate with manual search fallback and smart shopping.</p>
          <Link className="btn-primary" to="/nutrition">Open Nutrition</Link>
        </article>

        <article className="feature-card glass">
          <Flame size={18} />
          <h3>Streak & Consistency</h3>
          <p>Daily streaks, missed workout alerts, weekly scores, and trend-based feedback.</p>
          <Link className="btn-primary" to="/analytics">Open Analytics</Link>
        </article>

        <article className="feature-card glass">
          <Watch size={18} />
          <h3>Fitness Bands & WhatsApp</h3>
          <p>Sync Google Fit/Fitbit metrics, reminders, and quick AI chat updates on WhatsApp.</p>
          <Link className="btn-primary" to="/integrations">Open Integrations</Link>
        </article>

        <article className="feature-card glass">
          <Bell size={18} />
          <h3>User Hub</h3>
          <p>Signup/login, profile setup, progress photos, notification preferences, and dashboard stats.</p>
          <Link className="btn-primary" to="/dashboard">Open User Hub</Link>
        </article>
      </section>

      <section className="feature-card glass">
        <MessageCircle size={18} />
        <h3>Build Sequence (as requested)</h3>
        <ul className="feature-list">
          <li>1) Frontend pages for all modules</li>
          <li>2) Django API endpoints with JWT + secure CORS</li>
          <li>3) `.env` configuration for OpenAI, Google, Fitbit, nutrition, WhatsApp, music APIs</li>
        </ul>
      </section>
    </motion.div>
  )
}
