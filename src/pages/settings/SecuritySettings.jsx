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
  const {
    currentUser,
    requestPasswordReset,
    listSessions,
    revokeOtherSessions,
    requestAccountDeletion,
    deleteAccount,
    signOut,
  } = useApp()
  const navigate = useNavigate()

  const [pwOpen, setPwOpen] = useState(false)
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwNotice, setPwNotice] = useState('')

  const [sessions, setSessions] = useState(null) // null = loading, [] = none, false = unsupported
  const [sessionError, setSessionError] = useState('')
  const [revoking, setRevoking] = useState(false)

  // idle -> sent (code emailed) -> deleting
  const [deleteStep, setDeleteStep] = useState('idle')
  const [deleteSentTo, setDeleteSentTo] = useState('')
  const [deleteCode, setDeleteCode] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const deleting = deleteStep === 'deleting'
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

  // A short cooldown on resending, so a double click can't send a pile of
  // emails. The server rate-limits too; this just stops it being tempting.
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

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

  async function sendDeleteCode() {
    setDeleteError('')
    setSendingCode(true)
    try {
      const { sentTo } = await requestAccountDeletion()
      setDeleteSentTo(sentTo)
      setDeleteCode('')
      setDeleteStep('sent')
      setResendIn(45)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setSendingCode(false)
    }
  }

  async function handleDelete(e) {
    e?.preventDefault()
    if (deleteCode.length !== 6 || deleting) return
    setDeleteError('')
    setDeleteStep('deleting')
    try {
      await deleteAccount(deleteCode)
      navigate('/')
    } catch (err) {
      setDeleteError(err.message)
      setDeleteStep('sent')
      setDeleteCode('')
    }
  }

  function cancelDelete() {
    setDeleteStep('idle')
    setDeleteCode('')
    setDeleteError('')
  }

  return (
    <>
      <Section title="Sign-in">
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
      <Section title="Password">
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

      <Section title="Active sessions">
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

      <DangerZone title="Delete account">
        {deleteStep === 'idle' ? (
          <Row
            title="Delete your account"
            description="This removes your account, saved items and any workspace only you are in. We'll email you a code to confirm it's you."
          >
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              onClick={sendDeleteCode}
              disabled={sendingCode}
            >
              {sendingCode ? 'Sending code…' : 'Delete my account'}
            </button>
          </Row>
        ) : (
          <form className="settings-verify" onSubmit={handleDelete}>
            <p className="settings-verify-lead">
              We sent a 6-digit code to <strong>{deleteSentTo}</strong>. Enter it below to permanently
              delete your account. The code expires in 10 minutes.
            </p>

            <label className="settings-verify-field">
              <span className="settings-stack-label">Verification code</span>
              <input
                className="settings-input settings-code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={deleteCode}
                placeholder="000000"
                autoFocus
                onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                aria-label="6-digit verification code"
              />
            </label>

            <Feedback error={deleteError} />

            <div className="settings-verify-actions">
              <button
                type="submit"
                className="settings-btn settings-btn-danger"
                disabled={deleteCode.length !== 6 || deleting}
              >
                {deleting ? 'Deleting…' : 'Permanently delete account'}
              </button>
              <button
                type="button"
                className="settings-btn settings-btn-ghost"
                onClick={sendDeleteCode}
                disabled={resendIn > 0 || sendingCode || deleting}
              >
                {sendingCode ? 'Sending…' : resendIn > 0 ? `Resend in ${resendIn}s` : 'Send a new code'}
              </button>
              <button type="button" className="settings-btn settings-btn-ghost" onClick={cancelDelete} disabled={deleting}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {deleteStep === 'idle' && <Feedback error={deleteError} />}
      </DangerZone>
    </>
  )
}
