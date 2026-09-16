import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

/**
 * The other half of the email-link password flow.
 *
 * Reached only from the link in the reset email, which carries a single-use
 * token. Possession of that token is the whole proof — the person following it
 * has demonstrated control of the mailbox, which is what authorises the change.
 * No current password is asked for, and none would help: someone who knows the
 * old password but not the mailbox should not be able to take the account, and
 * someone locked out of the password should still be able to recover it.
 */
export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { resetPasswordWithToken } = useApp()

  const token = params.get('token') || ''
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (next.length < 12) {
      setError('Use at least 12 characters. A short phrase you can remember beats a short scramble.')
      return
    }
    if (next !== confirm) {
      setError("Those two passwords don't match.")
      return
    }
    setBusy(true)
    try {
      await resetPasswordWithToken({ token, newPassword: next })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="page-empty-state">
        <h2>That link is incomplete</h2>
        <p>
          Password reset links work once and expire. Ask for a fresh one from Sign-in &amp; security
          in Settings.
        </p>
        <Link to="/settings/security" className="settings-btn">Open settings</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="page-empty-state">
        <h2>Password changed</h2>
        <p>Every other device has been signed out. Use the new password from now on.</p>
        <button type="button" className="settings-btn settings-btn-primary" onClick={() => navigate('/signin')}>
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="reset-page">
      <h1 className="deck-heading">Set a new password</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>
        This link came to your email address, which is what verifies it's you.
      </p>

      <form className="reset-form" onSubmit={submit}>
        <label className="settings-stack-field">
          <span className="settings-stack-label">New password</span>
          <input
            type="password"
            className="settings-input"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <span className="settings-stack-hint">At least 12 characters.</span>
        </label>

        <label className="settings-stack-field">
          <span className="settings-stack-label">Confirm new password</span>
          <input
            type="password"
            className="settings-input"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>

        {error && <p className="settings-error">{error}</p>}

        <button type="submit" className="settings-btn settings-btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </div>
  )
}
