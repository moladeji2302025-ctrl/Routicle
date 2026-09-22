import { useEffect, useState } from 'react'
import * as api from '../../lib/api'

const LABEL = {
  'role.set': 'Changed a role',
  'role.revoke': 'Removed team access',
}

function describe(e) {
  const what = LABEL[e.action] || e.action
  const extra = e.detail?.role ? ` to ${e.detail.role}` : ''
  return `${what}${extra}`
}

/** Who did what in the console, newest first. Full admins only. */
export default function AdminActivityPage() {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchAdminAudit()
      .then(({ entries: rows }) => setEntries(rows))
      .catch((err) => {
        setError(err.message)
        setEntries([])
      })
  }, [])

  return (
    <section className="admin-section">
      <header className="adm-page-head">
        <h2>Activity</h2>
        <p>Every change to who has access, and by whom.</p>
      </header>
      {error && <p className="settings-error">{error}</p>}
      {entries === null ? (
        <p className="explore-empty">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="explore-empty">Nothing has been recorded yet.</p>
      ) : (
        <ol className="adm-feed">
          {entries.map((e) => (
            <li key={e.id} className="adm-feed-row">
              <span className="adm-feed-dot" />
              <div>
                <strong>{describe(e)}</strong>
                {e.target && <span className="adm-feed-target"> · {e.target}</span>}
                <span className="adm-feed-meta">
                  {e.actor || 'Unknown'} · {new Date(e.at).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
