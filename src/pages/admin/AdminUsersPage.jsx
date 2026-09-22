import { useEffect, useState } from 'react'
import * as api from '../../lib/api'
import { useApp } from '../../context/AppContext'
import { UserIcon, SearchIcon } from '../../components/icons'
import { ROLE_LABEL } from './AdminLayout'

const TIER_LABEL = { free: 'Free', standard: 'Standard', express: 'Express' }
const ROLES = ['admin', 'marketing', 'sales', 'support', 'moderator']

export default function AdminUsersPage() {
  const { adminRole, currentUser } = useApp()
  const canEdit = adminRole === 'admin'

  const [users, setUsers] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

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
              {u.isCreator && <span className="adm-chip">Creator</span>}
              {u.staffRole && <span className="adm-chip adm-chip-strong">{ROLE_LABEL[u.staffRole]}</span>}

              {canEdit && (
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
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
