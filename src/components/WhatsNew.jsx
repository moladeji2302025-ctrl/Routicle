import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUpdates } from '../lib/api'
import { SparkleIcon, ChevronRightIcon } from './icons'

const SEEN_KEY = 'routicle_updates_seen'

const CATEGORY_LABEL = {
  feature: 'New',
  improvement: 'Improved',
  fix: 'Fixed',
  announcement: 'News',
}

function when(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return d.toLocaleDateString()
}

/**
 * The dashboard's "What's new" rail, fed by whatever admins have published.
 *
 * Renders nothing at all when there's nothing published or the API is
 * unreachable — an empty panel saying "no updates" is worse than no panel.
 */
export default function WhatsNew({ limit = 4 }) {
  const [updates, setUpdates] = useState([])
  const [seenAt, setSeenAt] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    let cancelled = false
    fetchUpdates(limit)
      .then(({ updates: rows }) => !cancelled && setUpdates(rows))
      .catch(() => {
        // Offline, or the API isn't running locally — stay silent rather than
        // showing an error box on someone's dashboard.
      })
    return () => {
      cancelled = true
    }
  }, [limit])

  if (updates.length === 0) return null

  const newest = updates[0]?.publishedAt || ''
  const hasUnseen = newest && newest > seenAt

  function markSeen() {
    setSeenAt(newest)
    try {
      localStorage.setItem(SEEN_KEY, newest)
    } catch {
      // storage blocked — the dot just comes back next visit
    }
  }

  return (
    <section className="app-section whats-new">
      <div className="app-section-head">
        <h2>
          <SparkleIcon size={15} color="var(--brand-violet)" />
          What&apos;s new
          {hasUnseen && <span className="whats-new-dot" aria-label="New updates" />}
        </h2>
        <Link to="/updates" className="app-section-link" onClick={markSeen}>
          All updates <ChevronRightIcon size={11} color="currentColor" />
        </Link>
      </div>

      <div className="whats-new-list">
        {updates.map((u) => (
          <article key={u.id} className="whats-new-item">
            <span className={`update-tag update-tag-${u.category}`}>
              {CATEGORY_LABEL[u.category] || u.category}
            </span>
            <div className="whats-new-body">
              <h3>{u.title}</h3>
              <p>{u.body}</p>
              {u.linkUrl && (
                <Link to={u.linkUrl} className="whats-new-link" onClick={markSeen}>
                  {u.linkLabel || 'Take a look'} <ChevronRightIcon size={10} color="currentColor" />
                </Link>
              )}
            </div>
            <span className="whats-new-when">{when(u.publishedAt)}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
