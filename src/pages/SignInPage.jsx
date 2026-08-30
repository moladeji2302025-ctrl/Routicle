import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function SignInPage() {
  const { signIn } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!email.trim()) return
    signIn({ email: email.trim() })
    navigate('/')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">Prototype auth — enter any email to continue your session.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </label>
          <button type="submit" className="btn-hero-primary auth-submit">Sign in</button>
        </form>

        <p className="auth-switch">
          New to Routicle? <a href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup') }}>Create an account</a>
        </p>
      </div>
    </div>
  )
}
