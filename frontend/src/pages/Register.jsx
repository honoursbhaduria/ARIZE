import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Dumbbell, AlertCircle, ArrowLeft, Eye, EyeOff, UserPlus, Sparkles } from 'lucide-react'
import { registerUser, loginAsDemo, supabaseRegister, exchangeSupabaseSession, isAuthenticated } from '../services/api'
import './Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const handleRegister = async (event) => {
    event.preventDefault()
    const cleanUsername = form.username.trim()
    const cleanEmail = form.email.trim()

    if (!cleanUsername || !cleanEmail || !form.password) {
      setError('Please fill in all fields.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)
    setError('')

    try {
      let sbSession = null
      try {
        sbSession = await supabaseRegister({
          email: cleanEmail,
          password: form.password,
          username: cleanUsername,
        })
      } catch (sbErr) {
        console.warn('Supabase signup notice:', sbErr.message)
        if (sbErr.message && (sbErr.message.includes('already registered') || sbErr.message.includes('already in use'))) {
          setError('A user with that email already exists. Please sign in instead.')
          setLoading(false)
          return
        }
      }

      try {
        await registerUser({
          username: cleanUsername,
          email: cleanEmail,
          password: form.password,
        })
      } catch (apiErr) {
        // Backend signup failed but Supabase gave us a session: exchange it instead.
        if (!sbSession) {
          throw apiErr
        }
        await exchangeSupabaseSession(sbSession)
      }

      navigate('/onboarding')
    } catch (err) {
      setError(err.message || 'Unable to create account right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoAccess = async () => {
    setDemoLoading(true)
    setError('')
    try {
      await loginAsDemo()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Demo access unavailable right now.')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="auth-page-root">
      <div className="auth-side-visual">
        <video
          className="auth-side-video"
          src="/login-bg.mp4"
          poster="/image.png"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="auth-side-overlay" />
        <div className="visual-content">
          <Link to="/" className="auth-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Dumbbell size={28} strokeWidth={3} />
            <span style={{ fontSize: '1.5rem' }}>ARIZE</span>
          </Link>
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
          <div className="auth-top-bar">
            <Link to="/" className="auth-back-link">
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>
            <Link to="/" className="auth-mobile-brand">
              <Dumbbell size={20} strokeWidth={2.8} />
              <span>ARIZE</span>
            </Link>
          </div>

          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join the future of intelligent fitness tracking.</p>
          </div>

          <button
            type="button"
            className="btn-demo"
            onClick={handleDemoAccess}
            disabled={demoLoading || loading}
          >
            <Sparkles size={16} />
            <span>{demoLoading ? 'Accessing Demo Hub...' : 'Quick Demo Access (1-Click)'}</span>
          </button>

          <div className="auth-divider">or register with Supabase</div>

          <form className="auth-form" onSubmit={handleRegister}>
            <div className="auth-input-group">
              <label>Username</label>
              <input
                className="auth-input"
                value={form.username}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, username: event.target.value }))
                  if (error) setError('')
                }}
                placeholder="Pick a unique username"
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>

            <div className="auth-input-group">
              <label>Email Address</label>
              <input
                className="auth-input"
                value={form.email}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                  if (error) setError('')
                }}
                placeholder="email@example.com"
                type="email"
                autoComplete="email"
              />
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <div className="auth-password-wrapper">
                <input
                  className="auth-input has-toggle"
                  value={form.password}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, password: event.target.value }))
                    if (error) setError('')
                  }}
                  placeholder="Min. 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading || demoLoading}
              style={{ height: '3rem', marginTop: '0.5rem' }}
            >
              <UserPlus size={18} />
              <span>{loading ? 'Creating Profile...' : 'Get Started'}</span>
            </button>
          </form>

          {error && (
            <div className="auth-error-msg">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <p className="auth-footer-link">
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
