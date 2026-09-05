import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Section, Row, Field, Feedback, DangerZone } from '../../components/settings/SettingsControls'

function formatWhen(value) {
  if (!value) return 'unknown'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleString()
}

export default function SecuritySettings() {
  const { currentUser, changePassword, listSessions, revokeOtherSessions, deleteAccount, signOut } = useApp()
  const navigate = useNavigate()

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwNotice, setPwNotice] = useState('')

  const [sessions, setSessions] = useState(null) // null = loading, [] = none, false = unsupported
  const [sessionError, setSessionError] = useState('')
  const [revoking, setRevoking] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false
    listSessions()
      .then((rows) => !cancelled && setSessions(rows))
      .catch(() => !cancelled && setSessions(false))
    return () => {
      cancelled = true
    }
  }, [listSessions])

  async function handlePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwNotice('')
    if (pw.next.length < 8) {
      setPwError('Use at least 8 characters.')
      return
    }
    if (pw.next !== pw.confirm) {
      setPwError("Those two passwords don't match.")
      return
    }
    setPwBusy(true)
    try {
      await changePassword({ currentPassword: pw.current, newPassword: pw.next, revokeOtherSessions: true })
      setPw({ current: '', next: '', confirm: '' })
      setPwNotice('Password changed. Other devices have been signed out.')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  async function handleRevoke() {
    setRevoking(true)
    setSessionError('')
    try {
      await revokeOtherSessions()
      const rows = await listSessions().catch(() => false)
      setSessions(rows)
    } catch (err) {
      setSessionError(err.message)
    } finally {
      setRevoking(false)
    }
  }

  async function handleDelete() {
    setDeleteError('')
    setDeleting(true)
    try {
      await deleteAccount()
      navigate('/')
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  return (
    <>
      <Section title="Sign-in" description="The identity behind everything you own here.">
        <Row title="Email" description="Used for sign-in, receipts and payout notices.">
          <span className="settings-static-value">{currentUser.email}</span>
        </Row>
        <Row
          title="Sign out"
          description="Ends this session on this device only."
        >
          <button
            type="button"
            className="settings-btn"
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
          >
            Sign out
          </button>
        </Row>
      </Section>

      <Section
        title="Password"
        description="Only applies to email/password accounts — if you signed in with Google, manage it there instead."
      >
        <form onSubmit={handlePassword}>
          <Field label="Current password">
            {(id) => (
              <input
                id={id}
                type="password"
                className="settings-input"
                autoComplete="current-password"
                value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                required
              />
            )}
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            {(id) => (
              <input
                id={id}
                type="password"
                className="settings-input"
                autoComplete="new-password"
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                required
              />
            )}
          </Field>
          <Field label="Confirm new password">
            {(id) => (
              <input
                id={id}
                type="password"
                className="settings-input"
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                required
              />
            )}
          </Field>
          <Feedback error={pwError} notice={pwNotice} />
          <div className="settings-actions">
            <button type="submit" className="settings-btn settings-btn-primary" disabled={pwBusy}>
              {pwBusy ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Active sessions" description="Every device currently signed in to this account.">
        {sessions === null && <p className="settings-row-desc">Loading…</p>}
        {sessions === false && (
          <p className="settings-row-desc">
            Session listing isn't available on this account's auth provider.
          </p>
        )}
        {Array.isArray(sessions) && sessions.length === 0 && (
          <p className="settings-row-desc">No other sessions found.</p>
        )}
        {Array.isArray(sessions) &&
          sessions.map((s) => (
            <div key={s.id || s.token} className="settings-session-row">
              <div className="settings-row-text">
                <span className="settings-row-title">{s.userAgent?.slice(0, 60) || 'Unknown device'}</span>
                <span className="settings-row-desc">
                  {s.ipAddress ? `${s.ipAddress} · ` : ''}expires {formatWhen(s.expiresAt)}
                </span>
              </div>
            </div>
          ))}
        <Feedback error={sessionError} />
        {Array.isArray(sessions) && sessions.length > 1 && (
          <div className="settings-actions">
            <button type="button" className="settings-btn" onClick={handleRevoke} disabled={revoking}>
              {revoking ? 'Signing out…' : 'Sign out all other devices'}
            </button>
          </div>
        )}
      </Section>

      <DangerZone
        title="Delete account"
        description="Removes your account, profile and team memberships. Work you've published stays credited unless you take it down first."
      >
        <Row
          title="This can't be undone"
          description="Type DELETE to confirm."
          stacked
        >
          <div className="settings-delete-row">
            <input
              type="text"
              className="settings-input"
              value={confirmDelete}
              placeholder="DELETE"
              onChange={(e) => setConfirmDelete(e.target.value)}
            />
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              disabled={confirmDelete !== 'DELETE' || deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </Row>
        <Feedback error={deleteError} />
      </DangerZone>
    </>
  )
}
