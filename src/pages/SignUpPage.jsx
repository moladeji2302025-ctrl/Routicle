import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import GoogleIcon from '../components/GoogleIcon'

export default function SignUpPage() {
  const { signUpWithEmail, signInWithGoogle } = useApp()
  const navigate = useNavigate()
  const [intent, setIntent] = useState('browse')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim() || !email.trim() || password.length < 8 || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await signUpWithEmail({ name: name.trim(), email: email.trim(), password, intent })
      navigate(intent === 'sell' ? '/become-creator' : '/')
    } catch (err) {
      setError(err.message || 'Could not create your account.')
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      await signInWithGoogle(intent)
    } catch (err) {
      setError(err.message || 'Google sign-up failed.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Join Routicle</h1>
        <p className="auth-subtitle">A light-touch start — tell us why you're here.</p>

        <div className="auth-intent-row">
          <button
            type="button"
            className={intent === 'browse' ? 'auth-intent-btn active' : 'auth-intent-btn'}
            onClick={() => setIntent('browse')}
          >
            I'm here to browse
          </button>
          <button
            type="button"
            className={intent === 'sell' ? 'auth-intent-btn active' : 'auth-intent-btn'}
            onClick={() => setIntent('sell')}
          >
            I'm here to sell my work
          </button>
        </div>

        <button type="button" className="auth-oauth-btn" onClick={handleGoogle}>
          <GoogleIcon size={18} />
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </label>
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
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>
          {error && <p className="upload-error">{error}</p>}
          <button type="submit" className="btn-hero-primary auth-submit" disabled={submitting}>
            {submitting ? 'Creating account…' : intent === 'sell' ? 'Continue to creator application' : 'Create free account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <a href="/signin" onClick={(e) => { e.preventDefault(); navigate('/signin') }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
