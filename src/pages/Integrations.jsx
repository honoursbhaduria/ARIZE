import { motion } from 'framer-motion'
import { Watch, MessageCircle, Music, Link2 } from 'lucide-react'
import './FeaturePages.css'

export default function Integrations() {
  return (
    <motion.div
      className="page-container feature-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <section className="feature-hero glass">
        <div className="feature-badge"><Link2 size={14} /> Connected Experiences</div>
        <h1>Wearables, WhatsApp & Gym Music</h1>
        <p>Import fitness data, chat on WhatsApp, send reminders, and play mood-based workout playlists.</p>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass">
          <h3><Watch size={16} /> Fitness Band Integration</h3>
          <ul className="feature-list">
            <li>Sync steps, heart rate, sleep, calories burned</li>
            <li>Providers: Google Fit / Fitbit</li>
            <li>Last sync: 12 minutes ago</li>
          </ul>
          <button className="btn-primary" type="button">Connect Device</button>
        </article>

        <article className="feature-card glass">
          <h3><MessageCircle size={16} /> WhatsApp Bot</h3>
          <ul className="feature-list">
            <li>Daily reminders and streak nudges</li>
            <li>Ask diet/workout questions instantly</li>
            <li>Quick updates from your AI coach</li>
          </ul>
          <button className="btn-primary" type="button">Link WhatsApp</button>
        </article>

        <article className="feature-card glass">
          <h3><Music size={16} /> Gym Music Integration</h3>
          <div className="tag-row">
            <span className="tag">Cardio 🔥</span>
            <span className="tag">Strength 💪</span>
            <span className="tag">Relax 🧘</span>
          </div>
          <ul className="feature-list">
            <li>Spotify playlist recommendations</li>
            <li>YouTube fallback mode</li>
            <li>Mood-based playlist switching</li>
          </ul>
        </article>
      </section>
    </motion.div>
  )
}
