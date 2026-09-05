import { useEffect, useState } from 'react'
import * as api from '../../lib/api'
import { departmentLabel } from '../../data/departments'

const STATUSES = [
  { id: '', label: 'All' },
  { id: 'approved', label: 'Live' },
  { id: 'pending', label: 'Pending' },
  { id: 'rejected', label: 'Rejected' },
]

export default function AdminContentPage() {
  const [items, setItems] = useState(null)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  async function load() {
    try {
      const { items: rows } = await api.fetchAdminContent({ status, q: query.trim() })
      setItems(rows)
    } catch (err) {
      setError(err.message)
      setItems([])
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [status, query])

  async function act(id, fn) {
    setBusyId(id)
    setError('')
    try {
      await fn()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="admin-section">
      <h2>Library</h2>
      <p className="settings-section-desc">
        Everything in the catalogue, whatever its state. Marking a piece free removes its paywall
        for everyone; removing it takes it down permanently.
      </p>

      <div className="projects-toolbar">
        <div className="explore-chip-row" style={{ padding: 0, margin: 0 }}>
          {STATUSES.map((s) => (
            <button
              key={s.id || 'all'}
              type="button"
              className={status === s.id ? 'explore-chip explore-chip-active' : 'explore-chip'}
              onClick={() => setStatus(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="settings-input"
          style={{ maxWidth: 280 }}
          value={query}
          placeholder="Search title or creator…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <p className="settings-error">{error}</p>}

      {items === null ? (
        <p className="explore-empty">Loading…</p>
      ) : items.length === 0 ? (
        <p className="explore-empty">Nothing matches.</p>
      ) : (
        <div className="download-list">
          {items.map((item) => (
            <div key={item.id} className="download-row">
              <div className="download-info">
                <span className="download-title">{item.title}</span>
                <span className="download-meta">
                  {item.creatorName} · {departmentLabel(item.department)}
                  {item.fileTypes.length > 0 ? ` · ${item.fileTypes.join(', ')}` : ''} ·{' '}
                  {item.downloads} downloads
                </span>
              </div>

              <span className={`admin-status admin-status-${item.moderationStatus}`}>
                {item.moderationStatus}
              </span>
              {item.isFree && <span className="settings-pill">Free</span>}

              <button
                type="button"
                className="settings-btn"
                disabled={busyId === item.id}
                onClick={() => act(item.id, () => api.patchAdminContent({ id: item.id, isFree: !item.isFree }))}
              >
                {item.isFree ? 'Make paid' : 'Mark free'}
              </button>

              {item.moderationStatus !== 'approved' && (
                <button
                  type="button"
                  className="settings-btn"
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, () => api.patchAdminContent({ id: item.id, moderationStatus: 'approved' }))}
                >
                  Approve
                </button>
              )}
              {item.moderationStatus === 'approved' && (
                <button
                  type="button"
                  className="settings-btn"
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, () => api.patchAdminContent({ id: item.id, moderationStatus: 'pending' }))}
                >
                  Unpublish
                </button>
              )}

              <button
                type="button"
                className="settings-btn settings-btn-danger"
                disabled={busyId === item.id}
                onClick={() => {
                  if (window.confirm(`Permanently remove “${item.title}”? This can't be undone.`)) {
                    act(item.id, () => api.deleteAdminContent(item.id))
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
