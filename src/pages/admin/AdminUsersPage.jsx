import { useEffect, useState } from 'react'
import * as api from '../../lib/api'
import { UserIcon } from '../../components/icons'

const TIER_LABEL = { free: 'Free', standard: 'Standard', express: 'Express' }

export default function AdminUsersPage() {
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

  async function toggleAdmin(user) {
    setBusyId(user.id)
    setError('')
    try {
      if (user.isAdmin) await api.revokeAdmin(user.id)
      else await api.grantAdmin(user.id)
      await load(query.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="admin-section">
      <h2>People</h2>
      <p className="settings-section-desc">
        Everyone with an account. Granting admin gives full access to this console and every
        endpoint behind it.
      </p>

      <div className="settings-inline-form">
        <input
          type="search"
          className="settings-input"
          value={query}
          placeholder="Search by name or email…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <p className="settings-error">{error}</p>}

      {users === null ? (
        <p className="explore-empty">Loading…</p>
      ) : users.length === 0 ? (
        <p className="explore-empty">No accounts match that search.</p>
      ) : (
        <div className="download-list">
          {users.map((u) => (
            <div key={u.id} className="download-row">
              {u.image ? (
                <img src={u.image} alt="" className="settings-list-avatar" />
              ) : (
                <span className="settings-list-avatar settings-avatar-fallback">
                  <UserIcon size={14} color="currentColor" />
                </span>
              )}
              <div className="download-info">
                <span className="download-title">{u.name || u.email}</span>
                <span className="download-meta">
                  {u.email} · joined {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>

              <span className="settings-pill">{TIER_LABEL[u.tier] || u.tier}</span>
              {u.isCreator && <span className="settings-pill">Creator</span>}
              {u.isAdmin && <span className="admin-pill-strong">Admin</span>}

              <button
                type="button"
                className={u.isAdmin ? 'settings-btn settings-btn-danger' : 'settings-btn'}
                disabled={busyId === u.id}
                onClick={() => toggleAdmin(u)}
              >
                {busyId === u.id ? '…' : u.isAdmin ? 'Revoke admin' : 'Make admin'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
