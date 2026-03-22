import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Play, Cpu } from 'lucide-react'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing-root">
      <div className="landing-overlay" />
      
      <main className="landing-content">
        <motion.div 
          className="landing-badge"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Cpu size={14} />
          <span>V2.0 BIOMETRIC INTELLIGENCE</span>
        </motion.div>

        <motion.h1 
          className="landing-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          ARIZE <span className="text-outline">Overview</span>
        </motion.h1>

        <motion.p 
          className="landing-subtitle"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          Modern dark fitness intelligence hub with<br />adaptive coaching and posture vision.
        </motion.p>

        <motion.div 
          className="landing-actions-hero"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link to="/dashboard" className="landing-btn-primary">
            <span>Open Dashboard</span>
            <ArrowRight size={20} />
          </Link>
          <Link to="/vision" className="landing-btn-secondary">
            <Play size={18} fill="currentColor" />
            <span>Open Vision</span>
          </Link>
        </motion.div>

        <motion.div 
          className="landing-footer-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1 }}
        >
          <div className="stat-item">
            <div className="stat-value">60 FPS</div>
            <div className="stat-label">Real-time Vision</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-value">RAG</div>
            <div className="stat-label">AI Medical Sync</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-value">24/7</div>
            <div className="stat-label">Adaptive Coaching</div>
          </div>
        </motion.div>
      </main>

      {/* Decorative vertical lines */}
      <div className="v-line" style={{ left: '10%' }} />
      <div className="v-line" style={{ left: '30%' }} />
      <div className="v-line" style={{ right: '30%' }} />
      <div className="v-line" style={{ right: '10%' }} />
    </div>
  )
}
