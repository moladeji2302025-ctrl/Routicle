import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUpdates } from '../lib/api'
import { SparkleIcon } from '../components/icons'

const CATEGORY_LABEL = {
  feature: 'New feature',
  improvement: 'Improvement',
  fix: 'Fix',
  announcement: 'Announcement',
}

export default function UpdatesPage() {
  const [updates, setUpdates] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUpdates(50)
      .then(({ updates: rows }) => setUpdates(rows))
      .catch((err) => {
        setError(err.message)
        setUpdates([])
      })
  }, [])

  return (
    <div className="explore-page">
      <h1 className="deck-heading">What&apos;s new</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>
        Everything we&apos;ve shipped, newest first.
      </p>

      {error && <p className="settings-error">{error}</p>}

      {updates === null ? (
        <p className="explore-empty">Loading…</p>
      ) : updates.length === 0 ? (
        <div className="page-empty-state">
          <SparkleIcon size={26} color="currentColor" />
          <h2>Nothing here yet</h2>
          <p>Product updates will show up on this page as they ship.</p>
          <Link to="/explore" className="settings-btn settings-btn-primary">Browse the library</Link>
        </div>
      ) : (
        <div className="updates-feed">
          {updates.map((u) => (
            <article key={u.id} className="updates-entry">
              <div className="updates-entry-side">
                <span className={`update-tag update-tag-${u.category}`}>
                  {CATEGORY_LABEL[u.category] || u.category}
                </span>
                <span className="updates-entry-date">
                  {u.publishedAt ? new Date(u.publishedAt).toLocaleDateString() : ''}
                </span>
              </div>
              <div className="updates-entry-body">
                <h2>
                  {u.title}
                  {u.isPinned && <span className="settings-pill">Pinned</span>}
                </h2>
                <p>{u.body}</p>
                {u.linkUrl && (
                  <Link to={u.linkUrl} className="settings-btn">{u.linkLabel || 'Take a look'}</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
