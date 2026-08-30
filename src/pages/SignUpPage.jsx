import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function SignUpPage() {
  const { signUp } = useApp()
  const navigate = useNavigate()
  const [intent, setIntent] = useState('browse')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim() || !email.trim()) return
    signUp({ name: name.trim(), email: email.trim(), intent })
    navigate(intent === 'sell' ? '/become-creator' : '/')
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

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </label>
          <label className="auth-field">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </label>
          <button type="submit" className="btn-hero-primary auth-submit">
            {intent === 'sell' ? 'Continue to creator application' : 'Create free account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <a href="/signin" onClick={(e) => { e.preventDefault(); navigate('/signin') }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
