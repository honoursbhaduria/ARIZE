import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Dumbbell, AlertCircle, UserPlus } from 'lucide-react'
import { registerUser } from '../services/api'
import './Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (event) => {
    event.preventDefault()
    if (!form.username || !form.email || !form.password) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await registerUser(form)
      navigate('/onboarding')
    } catch (err) {
      setError(err.message || 'Unable to create account right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-root">
      <div className="auth-side-visual">
        <video
          className="auth-side-video"
          src="/login-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="auth-side-overlay" />
        <div className="visual-content">
          <div className="auth-brand">
            <Dumbbell size={28} strokeWidth={3} />
            <span style={{ fontSize: '1.5rem' }}>ARIZE</span>
          </div>
          <div className="visual-tagline">
            Unlock Your<br />Full Potential<br />with ARIZE AI.
          </div>
        </div>
        <div className="visual-footer">
          © 2026 ARIZE INTELLIGENCE. ALL RIGHTS RESERVED.
        </div>
      </div>

      <div className="auth-main-content">
        <motion.div
          className="auth-form-container"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join the future of intelligent fitness tracking.</p>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            <div className="auth-input-group">
              <label>Username</label>
              <input
                className="auth-input"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Pick a unique username"
                autoComplete="username"
              />
            </div>
            <div className="auth-input-group">
              <label>Email Address</label>
              <input
                className="auth-input"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="email@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
            <div className="auth-input-group">
              <label>Password</label>
              <input
                className="auth-input"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Min. 8 characters"
                type="password"
                autoComplete="new-password"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading} style={{ height: '3rem', marginTop: '0.5rem' }}>
              {loading ? 'Creating Profile...' : 'Get Started'}
            </button>
          </form>

          {error && (
            <div className="auth-error-msg">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <p className="auth-footer-link">
            Already have an account?<Link to="/login">Sign in here</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
