import { useEffect, useState } from 'react'
import * as api from '../../lib/api'
import { useApp } from '../../context/AppContext'
import { UserIcon, SearchIcon } from '../../components/icons'
import { ROLE_LABEL } from './AdminLayout'

const TIER_LABEL = { free: 'Free', standard: 'Standard', express: 'Express' }
const ROLES = ['admin', 'marketing', 'sales', 'support', 'moderator']

/** Comp a plan and suspend an account: a full admin's reach into any one profile. */
function ManageModal({ user, onClose, onDone }) {
  const [tier, setTier] = useState('standard')
  const [months, setMonths] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function run(key, fn) {
    setBusy(key)
    setError('')
    try {
      await fn()
      await onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{user.name || user.email}</h3>
        {error && <p className="settings-error">{error}</p>}

        <div className="adm-manage-block">
          <span className="settings-field-label">Plan</span>
          <p className="settings-field-hint">
            {user.isComped
              ? `Comped as ${TIER_LABEL[user.tier]}${user.planUntil ? ` until ${new Date(user.planUntil).toLocaleDateString()}` : ', indefinitely'}.`
              : `Currently ${TIER_LABEL[user.tier] || user.tier}.`}
          </p>
          <div className="adm-lead-add-actions">
            <select className="adm-select" value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="standard">Standard</option>
              <option value="express">Express</option>
            </select>
            <input className="settings-input" style={{ width: 110 }} type="number" min="0" placeholder="Months (blank = forever)" value={months} onChange={(e) => setMonths(e.target.value)} />
            <button type="button" className="settings-btn" disabled={busy === 'grant'} onClick={() => run('grant', () => api.grantAdminPlan(user.id, tier, months || undefined))}>
              {busy === 'grant' ? 'Granting…' : 'Grant'}
            </button>
            {user.isComped && (
              <button type="button" className="settings-btn settings-btn-ghost" disabled={busy === 'revoke'} onClick={() => run('revoke', () => api.revokeAdminPlan(user.id))}>
                Revoke comp
              </button>
            )}
          </div>
        </div>

        <div className="adm-manage-block">
          <span className="settings-field-label">Access</span>
          {user.suspended ? (
            <>
              <p className="settings-field-hint">Suspended{user.suspendReason ? `: ${user.suspendReason}` : '.'}</p>
              <button type="button" className="settings-btn" disabled={busy === 'unsuspend'} onClick={() => run('unsuspend', () => api.unsuspendAdminUser(user.id))}>
                {busy === 'unsuspend' ? 'Restoring…' : 'Restore access'}
              </button>
            </>
          ) : (
            <div className="adm-lead-add-actions">
              <input className="settings-input" style={{ flex: 1, minWidth: 180 }} placeholder="Reason (shown in the log)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button type="button" className="settings-btn settings-btn-danger" disabled={busy === 'suspend'} onClick={() => run('suspend', () => api.suspendAdminUser(user.id, reason))}>
                {busy === 'suspend' ? 'Suspending…' : 'Suspend account'}
              </button>
            </div>
          )}
        </div>

        <div className="adm-modal-actions">
          <button type="button" className="settings-btn settings-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const { adminRole, currentUser } = useApp()
  const canEdit = adminRole === 'admin'

  const [users, setUsers] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [managing, setManaging] = useState(null)

  async function load(q) {
    try {
      const { users: rows } = await api.fetchAdminUsers(q)
      setUsers(rows)
    } catch (err) {
      setError(err.message)
      setUsers([])
    }
  }

  useEffect(() => {
    load('')
  }, [])

  // Server-side search rather than filtering in the browser: the endpoint caps
  // at 200 rows, so a local filter would only ever search that first page.
  useEffect(() => {
    const t = setTimeout(() => load(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  async function setRole(user, role) {
    setBusyId(user.id)
    setError('')
    try {
      if (role === '') await api.revokeAdmin(user.id)
      else await api.grantAdmin(user.id, role)
      await load(query.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  const staff = (users || []).filter((u) => u.staffRole)

  return (
    <section className="admin-section">
      <header className="adm-page-head">
        <h2>People</h2>
        <p>
          {canEdit
            ? 'Everyone with an account, and who on the team can do what. A role opens only that department’s pages; Admin opens everything.'
            : 'Everyone with an account. You can look people up here; changes are made by an admin.'}
        </p>
      </header>

      {users && (
        <div className="adm-kpis">
          <div className="adm-kpi"><strong>{users.length}</strong><span>Accounts shown</span></div>
          <div className="adm-kpi"><strong>{users.filter((u) => u.isCreator).length}</strong><span>Creators</span></div>
          <div className="adm-kpi"><strong>{users.filter((u) => u.tier !== 'free').length}</strong><span>On a paid plan</span></div>
          <div className="adm-kpi"><strong>{staff.length}</strong><span>On the team</span></div>
        </div>
      )}

      <label className="adm-search">
        <SearchIcon size={15} color="currentColor" />
        <input
          type="search"
          value={query}
          placeholder="Search by name or email"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {error && <p className="settings-error">{error}</p>}

      {users === null ? (
        <p className="explore-empty">Loading…</p>
      ) : users.length === 0 ? (
        <p className="explore-empty">No accounts match that search.</p>
      ) : (
        <ul className="adm-people">
          {users.map((u) => (
            <li key={u.id} className="adm-person">
              {u.image ? (
                <img src={u.image} alt="" className="adm-avatar" />
              ) : (
                <span className="adm-avatar adm-avatar-fallback">
                  <UserIcon size={15} color="currentColor" />
                </span>
              )}
              <div className="adm-person-main">
                <span className="adm-person-name">{u.name || u.email || 'Unnamed'}</span>
                <span className="adm-person-meta">
                  {u.email ? `${u.email} · ` : ''}joined {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>

              <span className="adm-chip">{TIER_LABEL[u.tier] || u.tier}</span>
              {u.isComped && <span className="adm-chip">Comped</span>}
              {u.isCreator && <span className="adm-chip">Creator</span>}
              {u.staffRole && <span className="adm-chip adm-chip-strong">{ROLE_LABEL[u.staffRole]}</span>}
              {u.suspended && <span className="adm-chip adm-chip-danger">Suspended</span>}

              {canEdit && (
                <>
                  <select
                    className="adm-select"
                    value={u.staffRole || ''}
                    disabled={busyId === u.id || u.id === currentUser?.id}
                    aria-label={`Role for ${u.name || u.email}`}
                    title={u.id === currentUser?.id ? 'You can’t change your own role' : undefined}
                    onChange={(e) => setRole(u, e.target.value)}
                  >
                    <option value="">No team role</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="settings-btn"
                    disabled={u.id === currentUser?.id}
                    title={u.id === currentUser?.id ? 'You can’t manage your own account here' : undefined}
                    onClick={() => setManaging(u)}
                  >
                    Manage
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {managing && (
        <ManageModal
          user={managing}
          onClose={() => setManaging(null)}
          onDone={async () => {
            await load(query.trim())
            setManaging(null)
          }}
        />
      )}
    </section>
  )
}
