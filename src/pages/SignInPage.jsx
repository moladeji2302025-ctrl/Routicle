import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import GoogleIcon from '../components/GoogleIcon'

export default function SignInPage() {
  const { signInWithEmail, signInWithGoogle } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!email.trim() || !password || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await signInWithEmail({ email: email.trim(), password })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Could not sign you in.')
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign-in failed.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">Welcome back.</p>

        <button type="button" className="auth-oauth-btn" onClick={handleGoogle}>
          <GoogleIcon size={18} />
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </label>
          <label className="auth-field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </label>
          {error && <p className="upload-error">{error}</p>}
          <button type="submit" className="btn-hero-primary auth-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          New to Routicle? <a href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup') }}>Create an account</a>
        </p>
      </div>
    </div>
  )
}
