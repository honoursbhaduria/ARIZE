import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Dumbbell, AlertCircle, Mail, ArrowLeft, Eye, EyeOff, Sparkles, LogIn } from 'lucide-react'
import {
  loginUser,
  loginWithGoogle,
  loginAsDemo,
  supabaseLogin,
  supabaseGoogleLogin,
  completeSupabaseRedirect,
  isAuthenticated,
} from '../services/api'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')
  const [showGoogleInput, setShowGoogleInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true })
      return
    }

    // Returning from Google OAuth: swap the Supabase session for backend tokens.
    let cancelled = false
    completeSupabaseRedirect()
      .then((result) => {
        if (result && !cancelled) {
          navigate('/dashboard', { replace: true })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Google sign-in could not be completed.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleLogin = async (event) => {
    event.preventDefault()
    const cleanIdentifier = username.trim()
    if (!cleanIdentifier || !password) {
      setError('Please enter your email or username, and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // If identifier is an email, try Supabase auth first
      if (cleanIdentifier.includes('@')) {
        try {
          await supabaseLogin({ email: cleanIdentifier, password })
          navigate('/dashboard')
          return
        } catch (sbErr) {
          // If Supabase fails, attempt backend login fallback
          console.warn('Supabase login:', sbErr.message)
        }
      }

      // Backend API login (handles username or email)
      await loginUser({ username: cleanIdentifier, password })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async (event) => {
    if (event) event.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Attempt Supabase Google OAuth
      await supabaseGoogleLogin()
    } catch (sbErr) {
      console.warn('Supabase OAuth notice:', sbErr.message)
      // Fallback: email-based Google login bridge
      const emailToUse = googleEmail.trim() || (username.includes('@') ? username.trim() : '')
      if (!emailToUse) {
        setShowGoogleInput(true)
        setError('Please enter your Google email address below to continue.')
        setLoading(false)
        return
      }

      try {
        await loginWithGoogle(emailToUse)
        navigate('/dashboard')
      } catch (err) {
        setError(err.message || 'Google sign-in unavailable.')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDemoAccess = async () => {
    setDemoLoading(true)
    setError('')
    try {
      await loginAsDemo()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Demo login unavailable right now.')
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
            <h1>Sign In</h1>
            <p>Welcome back. Access your fitness intelligence hub.</p>
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

          <div className="auth-divider">or sign in with credentials</div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-input-group">
              <label>Email or Username</label>
              <input
                className="auth-input"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter email or username"
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <div className="auth-password-wrapper">
                <input
                  className="auth-input has-toggle"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError('')
                  }}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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

            <button className="btn-primary" type="submit" disabled={loading || demoLoading} style={{ height: '3rem' }}>
              <LogIn size={18} />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="auth-divider">or continue with</div>

          <form className="auth-google-form" onSubmit={handleGoogleLogin}>
            {showGoogleInput && (
              <div className="auth-input-group">
                <input
                  className="auth-input"
                  value={googleEmail}
                  onChange={(event) => {
                    setGoogleEmail(event.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Enter your google email"
                  type="email"
                  autoFocus
                />
              </div>
            )}
            <button
              className="btn-google"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || demoLoading}
            >
              <Mail size={18} />
              <span>Continue with Google</span>
            </button>
          </form>

          {error && (
            <div className="auth-error-msg">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <p className="auth-footer-link">
            Don't have an account? <Link to="/register">Sign up for free</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
