import { useEffect, useState } from 'react'
import { Link, useRouter, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, LogIn, Mail, PlayCircle } from 'lucide-react'
import { completeSupabaseRedirect, fetchSupabaseProviders, loginAsDemo, loginUser, supabaseGoogleLogin, supabaseLogin } from '../services/api'
import AuthLayout from '../layouts/AuthLayout'
import { Alert, Button, Field, Input } from '../ui/components'

// Only follow same-origin paths after login (never an absolute URL).
function safeRedirect(target) {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard'
}

export default function Login() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const search = useSearch({ from: '/login' })
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState('') // 'credentials' | 'demo' | 'google'
  const [error, setError] = useState('')
  // Only offer Google once it is enabled in Supabase (Authentication > Providers).
  const providers = useQuery({ queryKey: ['supabase', 'providers'], queryFn: fetchSupabaseProviders, staleTime: 5 * 60_000 })

  const finish = () => {
    queryClient.clear()
    router.history.push(safeRedirect(search.redirect))
  }

  // Returning from Google OAuth: swap the Supabase session for backend tokens.
  useEffect(() => {
    let cancelled = false
    completeSupabaseRedirect()
      .then((result) => {
        if (result && !cancelled) {
          queryClient.clear()
          router.history.push('/dashboard')
        }
      })
      .catch((err) => !cancelled && setError(err.message || 'Google sign-in could not be completed.'))
    return () => {
      cancelled = true
    }
  }, [router, queryClient])

  const run = async (kind, action) => {
    setPending(kind)
    setError('')
    try {
      await action()
      finish()
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please verify your credentials.')
      setPending('')
    }
  }

  const handleLogin = (event) => {
    event.preventDefault()
    const cleanIdentifier = identifier.trim()
    if (!cleanIdentifier || !password) {
      setError('Enter your email or username, and your password.')
      return
    }
    run('credentials', async () => {
      // Email addresses may belong to a Supabase account; fall back to the backend.
      if (cleanIdentifier.includes('@')) {
        try {
          await supabaseLogin({ email: cleanIdentifier, password })
          return
        } catch (sbErr) {
          console.warn('Supabase login:', sbErr.message)
        }
      }
      await loginUser({ username: cleanIdentifier, password })
    })
  }

  const handleGoogle = async () => {
    setPending('google')
    setError('')
    try {
      await supabaseGoogleLogin() // redirects away on success
    } catch (err) {
      setError(err.message || 'Google sign-in unavailable.')
      setPending('')
    }
  }

  const busy = Boolean(pending)

  return (
    <AuthLayout headline={<>Welcome back.<br />Your streak missed you.</>}>
      <div>
        <div className="eyebrow gold">Continue your quest</div>
        <h1>Sign in</h1>
      </div>

      <Button variant="violet" size="lg" block icon={PlayCircle} loading={pending === 'demo'} disabled={busy} onClick={() => run('demo', loginAsDemo)}>
        1-click demo
      </Button>

      <div className="auth__divider">or use your account</div>

      <form className="stack" onSubmit={handleLogin} noValidate>
        <Field label="Email or username" htmlFor="identifier">
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="password-wrap">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" variant="primary" size="lg" block icon={LogIn} loading={pending === 'credentials'} disabled={busy}>
          Sign in
        </Button>
      </form>

      {providers.data?.google && (
        <Button variant="ghost" block icon={Mail} loading={pending === 'google'} disabled={busy} onClick={handleGoogle}>
          Continue with Google
        </Button>
      )}

      <p className="muted center">
        New here? <Link to="/register" className="link">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
