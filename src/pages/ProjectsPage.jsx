import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { categoryLabel } from '../data/categories'
import { formatCount } from '../utils/format'
import { fetchMySubmissions } from '../lib/api'
import { HeartIcon, UploadIcon, PlusIcon } from '../components/icons'

const STATUS = {
  approved: { label: 'Live', tone: 'live' },
  pending: { label: 'In review', tone: 'review' },
  'changes-requested': { label: 'Needs changes', tone: 'changes' },
  rejected: { label: 'Not approved', tone: 'rejected' },
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Live' },
  { id: 'pending', label: 'In review' },
  { id: 'attention', label: 'Needs attention' },
]

const DownloadGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
)

function when(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The creator's own uploads. Read from the server when it's reachable, since
 * that is the only place a submission's real moderation state and reviewer note
 * live. Falls back to the local catalogue so the page still shows something in
 * the demo build, where there is no API.
 */
function useMyProjects(currentUser, contentItems, pendingSubmissions) {
  const [server, setServer] = useState(null) // null = not loaded, false = unavailable

  useEffect(() => {
    if (!currentUser?.isCreator) return undefined
    let cancelled = false
    fetchMySubmissions()
      .then(({ items }) => !cancelled && setServer(Array.isArray(items) ? items : []))
      .catch(() => !cancelled && setServer(false))
    return () => {
      cancelled = true
    }
  }, [currentUser?.isCreator])

  const local = useMemo(() => {
    if (!currentUser) return []
    const live = contentItems
      .filter((i) => i.creator === currentUser.name && i.moderationStatus === 'approved')
      .map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        fileTypes: i.fileTypes || [],
        free: i.free,
        status: 'approved',
        note: '',
        image: i.image,
        appreciations: i.appreciations || 0,
        downloads: i.views || 0,
        submittedAt: null,
      }))
    const review = pendingSubmissions
      .filter((s) => s.creatorName === currentUser.name)
      .map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        fileTypes: s.fileTypes || [],
        status: s.status || 'pending',
        note: '',
        image: null,
        appreciations: 0,
        downloads: 0,
        submittedAt: s.submittedAt,
      }))
    return [...review, ...live]
  }, [currentUser, contentItems, pendingSubmissions])

  return {
    loading: server === null && Boolean(currentUser?.isCreator),
    items: Array.isArray(server) ? server : local,
  }
}

export default function ProjectsPage() {
  const { currentUser, contentItems, pendingSubmissions } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const { loading, items } = useMyProjects(currentUser, contentItems, pendingSubmissions)

  const counts = useMemo(() => {
    const c = { approved: 0, pending: 0, attention: 0, downloads: 0, appreciations: 0 }
    for (const i of items) {
      if (i.status === 'approved') c.approved++
      else if (i.status === 'pending') c.pending++
      else c.attention++
      c.downloads += Number(i.downloads) || 0
      c.appreciations += Number(i.appreciations) || 0
    }
    return c
  }, [items])

  const visible = items.filter((i) => {
    if (filter === 'all') return true
    if (filter === 'attention') return i.status === 'rejected' || i.status === 'changes-requested'
    return i.status === filter
  })

  if (!currentUser) {
    return (
      <div className="pj-page pj-gate">
        <h1>Sign in to see your projects</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>
          Sign up free
        </button>
      </div>
    )
  }

  if (!currentUser.isCreator) {
    return (
      <div className="pj-page pj-gate">
        <span className="pj-gate-icon">
          <UploadIcon size={24} color="currentColor" />
        </span>
        <h1>Your uploaded work lives here</h1>
        <p>
          Apply as a creator to publish finished work you never used, and earn from the monthly pool every time
          it's downloaded.
        </p>
        <Link to="/become-creator" className="btn-hero-primary">
          Become a Creator
        </Link>
      </div>
    )
  }

  const stats = [
    { label: 'Live', value: counts.approved },
    { label: 'In review', value: counts.pending },
    { label: 'Downloads', value: formatCount(counts.downloads) },
    { label: 'Appreciations', value: formatCount(counts.appreciations) },
  ]

  return (
    <div className="pj-page">
      <header className="pj-head">
        <div>
          <h1>Projects</h1>
          <p>Everything you've uploaded, and where each piece is in review.</p>
        </div>
        <Link to="/upload" className="btn-hero-primary pj-upload">
          <PlusIcon size={15} color="currentColor" />
          Upload work
        </Link>
      </header>

      <div className="pj-stats">
        {stats.map((s) => (
          <div key={s.label} className="pj-stat">
            <span className="pj-stat-value">{s.value}</span>
            <span className="pj-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="pj-filters" role="tablist" aria-label="Filter projects">
        {FILTERS.map((f) => {
          const n =
            f.id === 'all' ? items.length : f.id === 'attention' ? counts.attention : counts[f.id]
          if (f.id === 'attention' && n === 0) return null
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={filter === f.id ? 'pj-filter pj-filter-on' : 'pj-filter'}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="pj-filter-count">{n}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="pj-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pj-card pj-card-skeleton" aria-hidden="true">
              <div className="pj-art" />
              <div className="pj-body">
                <span />
                <span />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="pj-empty">
          <span className="pj-gate-icon">
            <UploadIcon size={22} color="currentColor" />
          </span>
          <h2>
            {items.length === 0
              ? 'Nothing uploaded yet'
              : filter === 'approved'
                ? 'Nothing live yet'
                : filter === 'pending'
                  ? 'Nothing waiting for review'
                  : 'Nothing needs your attention'}
          </h2>
          <p>
            {items.length === 0
              ? 'Upload a finished piece you never got to use. Once an admin approves it, it goes live in the library.'
              : filter === 'approved'
                ? 'Your first approved upload will show up here.'
                : 'Everything you submitted has been reviewed.'}
          </p>
          {items.length === 0 && (
            <Link to="/upload" className="btn-hero-primary">
              Upload your first piece
            </Link>
          )}
        </div>
      ) : (
        <div className="pj-grid">
          {visible.map((item) => {
            const status = STATUS[item.status] || STATUS.pending
            const isLive = item.status === 'approved'
            const card = (
              <>
                <div className="pj-art">
                  {item.image ? (
                    <img src={item.image} alt="" loading="lazy" />
                  ) : (
                    <span className="pj-art-empty">{(item.title || '?').charAt(0).toUpperCase()}</span>
                  )}
                  <span className={`pj-status pj-status-${status.tone}`}>
                    <i />
                    {status.label}
                  </span>
                </div>

                <div className="pj-body">
                  <strong className="pj-title" title={item.title}>
                    {item.title || 'Untitled piece'}
                  </strong>
                  <span className="pj-meta">
                    {categoryLabel(item.category)}
                    {item.free ? ' · Free' : ''}
                  </span>

                  {item.fileTypes.length > 0 && (
                    <div className="pj-formats">
                      {item.fileTypes.map((f) => (
                        <span key={f}>{f}</span>
                      ))}
                    </div>
                  )}

                  {item.note && !isLive && <p className="pj-note">{item.note}</p>}

                  <div className="pj-foot">
                    {isLive ? (
                      <>
                        <span className="pj-figure">
                          <DownloadGlyph />
                          {formatCount(item.downloads)}
                        </span>
                        <span className="pj-figure">
                          <HeartIcon size={13} color="currentColor" />
                          {formatCount(item.appreciations)}
                        </span>
                        <span className="pj-open">Open</span>
                      </>
                    ) : (
                      <span className="pj-when">
                        {item.submittedAt ? `Submitted ${when(item.submittedAt)}` : 'Submitted'}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )

            // Only live pieces have a public page to open.
            return isLive ? (
              <Link key={item.id} to={`/design/${item.id}`} className="pj-card pj-card-link">
                {card}
              </Link>
            ) : (
              <div key={item.id} className="pj-card">
                {card}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
