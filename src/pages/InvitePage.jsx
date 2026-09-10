import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { orgClient } from '../lib/orgClient'
import { UsersIcon } from '../components/icons'

const PENDING_INVITE_KEY = 'routicle_pending_invite'

/**
 * Landing page for an invite link.
 *
 * Acceptance goes through Better Auth's own accept-invitation, which reads the
 * same neon_auth.invitation row the API wrote — it checks the invite is still
 * pending, unexpired, and addressed to the signed-in account, so none of that
 * is re-implemented here.
 */
export default function InvitePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser, refreshTeams, setActiveTeam } = useApp()
  const [status, setStatus] = useState('working') // working | done | error
  const [error, setError] = useState('')
  const attempted = useRef(false)

  useEffect(() => {
    // Signed out: remember the invite, sign in, come back. Sending someone
    // straight to sign-in would otherwise lose the link entirely.
    if (!currentUser) {
      try {
        sessionStorage.setItem(PENDING_INVITE_KEY, id)
      } catch {
        // storage blocked — the link in the email still works after signing in
      }
      setStatus('signed-out')
      return
    }

    if (attempted.current) return
    attempted.current = true

    ;(async () => {
      try {
        const result = await orgClient.organization.acceptInvitation({ invitationId: id })
        if (result?.error) throw new Error(result.error.message || 'This invite could not be accepted.')
        try {
          sessionStorage.removeItem(PENDING_INVITE_KEY)
        } catch {
          // ignore
        }
        const teams = await refreshTeams()
        const joined = teams.find((t) => t.id === result.data?.organizationId) || null
        if (joined) setActiveTeam(joined.id)
        setStatus('done')
      } catch (err) {
        setError(err.message)
        setStatus('error')
      }
    })()
  }, [id, currentUser, refreshTeams, setActiveTeam])

  return (
    <div className="dashboard-page dashboard-gate">
      <span className="folder-page-mark" aria-hidden="true">
        <UsersIcon size={20} color="currentColor" />
      </span>

      {status === 'working' && <h1>Joining the workspace…</h1>}

      {status === 'signed-out' && (
        <>
          <h1>You've been invited to a workspace</h1>
          <p>Sign in with the address the invite was sent to, and you'll be added straight away.</p>
          <div className="settings-inline-actions">
            <Link to="/signin" className="btn-hero-primary">Sign in</Link>
            <Link to="/signup" className="settings-btn">Create an account</Link>
          </div>
        </>
      )}

      {status === 'done' && (
        <>
          <h1>You're in</h1>
          <p>This workspace is now your active one — its collection, folders and plan are shared with you.</p>
          <div className="settings-inline-actions">
            <button type="button" className="btn-hero-primary" onClick={() => navigate('/team')}>
              Open the workspace
            </button>
            <Link to="/" className="settings-btn">Go to the dashboard</Link>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <h1>That invite didn't work</h1>
          <p className="settings-error">{error}</p>
          <p>
            Invites expire after 7 days, are single-use, and only work for the address they were
            sent to. Ask whoever invited you to send a new one.
          </p>
          <Link to="/" className="btn-hero-primary">Back to Routicle</Link>
        </>
      )}
    </div>
  )
}

export { PENDING_INVITE_KEY }
