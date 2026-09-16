import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Section, Row, Feedback, DangerZone } from '../../components/settings/SettingsControls'

function formatWhen(value) {
  if (!value) return 'unknown'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleString()
}

export default function SecuritySettings() {
  const { currentUser, requestPasswordReset, listSessions, revokeOtherSessions, deleteAccount, signOut } = useApp()
  const navigate = useNavigate()

  const [pwOpen, setPwOpen] = useState(false)
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

  async function handlePassword() {
    setPwError('')
    setPwNotice('')
    setPwBusy(true)
    try {
      await requestPasswordReset()
      setPwNotice(
        `If ${currentUser?.email} has a password sign-in, a single-use link is on its way. It expires shortly.`
      )
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
      await deleteAccount(confirmDelete.trim())
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

      {/* Changing a password is rare and dangerous, so it is folded away rather
          than sitting open on the page. An open form turns a borrowed session
          into an account takeover: whoever is already signed in only has to
          type a new password twice. Behind the fold there is no password field
          at all — the change happens through a link sent to the address on the
          account, so it takes the mailbox, not just the screen. */}
      <Section
        title="Password"
        description="Changed by email only. Applies to email/password accounts — if you signed in with Google, manage it there."
      >
        <Row
          title="Change your password"
          description="We email a single-use link to the address on this account. Nothing changes until you follow it."
        >
          <button
            type="button"
            className="settings-btn"
            aria-expanded={pwOpen}
            onClick={() => {
              setPwOpen((v) => !v)
              setPwError('')
              setPwNotice('')
            }}
          >
            {pwOpen ? 'Cancel' : 'Change password'}
          </button>
        </Row>

        {pwOpen && (
          <div className="settings-reveal">
            <p className="settings-row-desc">
              A link goes to <strong>{currentUser?.email}</strong>. Following it lets you set a new
              password and signs out every other device. If you don't recognise this request, ignore
              the email and nothing happens.
            </p>
            <Feedback error={pwError} notice={pwNotice} />
            <div className="settings-actions">
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                onClick={handlePassword}
                disabled={pwBusy}
              >
                {pwBusy ? 'Sending…' : 'Email me a reset link'}
              </button>
            </div>
          </div>
        )}
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
        description="Removes your account, profile, saved items, team memberships and any workspace only you are in. Any live subscription is cancelled first. Work you've published stays credited in the library unless you take it down yourself."
      >
        <Row
          title="This can't be undone"
          description={`Type ${currentUser.email} to confirm.`}
          stacked
        >
          <div className="settings-delete-row">
            <input
              type="email"
              className="settings-input"
              value={confirmDelete}
              placeholder={currentUser.email}
              autoComplete="off"
              onChange={(e) => setConfirmDelete(e.target.value)}
            />
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              // The server checks this again against the session's own address;
              // matching here only saves a pointless round trip.
              disabled={
                confirmDelete.trim().toLowerCase() !== currentUser.email.toLowerCase() || deleting
              }
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
