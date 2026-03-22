import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Dumbbell, AlertCircle, Mail } from 'lucide-react'
import { loginUser, loginWithGoogle } from '../services/api'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [googleEmail, setGoogleEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    if (!username || !password) {
      setError('Please fill in all fields.')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      await loginUser({ username, password })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Unable to sign in right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!googleEmail.trim()) {
      setError('Add your email for Google sign in.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await loginWithGoogle(googleEmail.trim())
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Google sign in unavailable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-root">
      <div className="auth-side-visual">
        <div className="visual-content">
          <div className="auth-brand">
            <Dumbbell size={28} strokeWidth={3} />
            <span style={{ fontSize: '1.5rem' }}>ARIZE</span>
          </div>
          <div className="visual-tagline">
            Elevate Your<br />Fitness with<br />AI Precision.
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
            <h1>Sign In</h1>
            <p>Welcome back. Please enter your details.</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-input-group">
              <label>Username</label>
              <input
                className="auth-input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
            <div className="auth-input-group">
              <label>Password</label>
              <input
                className="auth-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
              />
            </div>
            
            <button className="btn-primary" type="submit" disabled={loading} style={{ height: '3rem' }}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider">or</div>

          <div className="auth-form">
            <div className="auth-input-group">
              <input
                className="auth-input"
                value={googleEmail}
                onChange={(event) => setGoogleEmail(event.target.value)}
                placeholder="email@example.com"
                type="email"
              />
            </div>
            <button className="btn-google" type="button" onClick={handleGoogleLogin} disabled={loading}>
              <Mail size={18} />
              <span>Continue with Google</span>
            </button>
          </div>

          {error && (
            <div className="auth-error-msg">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <p className="auth-footer-link">
            Don't have an account?<Link to="/register">Sign up for free</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
