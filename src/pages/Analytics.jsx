import { motion } from 'framer-motion'
import { Flame, AlertCircle, TrendingUp, ChartNoAxesCombined } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './FeaturePages.css'

const weekly = [
  { week: 'W1', consistency: 58, protein: 82, burn: 1560 },
  { week: 'W2', consistency: 64, protein: 95, burn: 1730 },
  { week: 'W3', consistency: 70, protein: 104, burn: 1890 },
  { week: 'W4', consistency: 78, protein: 118, burn: 2100 },
]

export default function Analytics() {
  return (
    <motion.div
      className="page-container feature-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <section className="feature-hero glass">
        <div className="feature-badge"><ChartNoAxesCombined size={14} /> Smart Streak & Consistency</div>
        <h1>Analytics Dashboard</h1>
        <p>Calories burned, protein intake, weekly performance, and smart consistency insights.</p>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass">
          <h3><Flame size={16} /> Daily Streak</h3>
          <p className="kpi">14 🔥</p>
          <p>Keep training today to maintain your streak.</p>
        </article>

        <article className="feature-card glass">
          <h3><AlertCircle size={16} /> Missed Workout Detection</h3>
          <ul className="feature-list">
            <li>You missed 2 workouts this week</li>
            <li>Most misses occurred on Thursday</li>
            <li>Schedule nudge enabled for 5:30 PM</li>
          </ul>
        </article>

        <article className="feature-card glass">
          <h3><TrendingUp size={16} /> Smart Feedback</h3>
          <ul className="feature-list">
            <li>Your consistency improved by 20%</li>
            <li>Protein compliance improved for 3 weeks</li>
            <li>Cardio adherence dropped by 8%</li>
          </ul>
        </article>
      </section>

      <section className="feature-card glass">
        <h3>Weekly Consistency Score</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="week" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Line type="monotone" dataKey="consistency" stroke="#2563eb" strokeWidth={3} />
            <Line type="monotone" dataKey="protein" stroke="#0ea5e9" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </motion.div>
  )
}
