import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, PlayCircle, UserPlus } from 'lucide-react'
import { loginAsDemo } from '../services/api'
import { registerAccount } from '../lib/auth'
import AuthLayout from '../layouts/AuthLayout'
import { Alert, Button, Field, Input } from '../ui/components'

export default function Register() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleRegister = async (event) => {
    event.preventDefault()
    setPending('register')
    setError('')
    try {
      await registerAccount(form)
      queryClient.clear()
      navigate({ to: '/onboarding' })
    } catch (err) {
      setError(err.message || 'Unable to create account right now.')
      setPending('')
    }
  }

  const handleDemo = async () => {
    setPending('demo')
    setError('')
    try {
      await loginAsDemo()
      queryClient.clear()
      navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err.message || 'Demo access unavailable right now.')
      setPending('')
    }
  }

  const busy = Boolean(pending)

  return (
    <AuthLayout headline={<>Create your hero.<br />Earn your first XP today.</>}>
      <div>
        <div className="eyebrow gold">New player</div>
        <h1>Create account</h1>
      </div>

      <form className="stack" onSubmit={handleRegister} noValidate>
        <Field label="Username" htmlFor="username">
          <Input id="username" value={form.username} onChange={update('username')} placeholder="ironwill" autoComplete="username" autoCapitalize="none" spellCheck={false} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters">
          <div className="password-wrap">
            <Input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} placeholder="At least 8 characters" autoComplete="new-password" />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" variant="primary" size="lg" block icon={UserPlus} loading={pending === 'register'} disabled={busy}>
          Create account
        </Button>
      </form>

      <div className="auth__divider">or</div>

      <Button variant="violet" block icon={PlayCircle} loading={pending === 'demo'} disabled={busy} onClick={handleDemo}>
        Explore the demo first
      </Button>

      <p className="muted center">
        Already training with us? <Link to="/login" className="link">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
