import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { departmentLabel } from '../data/departments'
import { formatCount } from '../utils/format'
import { HeartIcon, EyeIcon, UploadIcon } from '../components/icons'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'review', label: 'In review' },
]

export default function ProjectsPage() {
  const { currentUser, contentItems, pendingSubmissions } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const live = useMemo(
    () =>
      contentItems.filter(
        (item) => item.creator === currentUser?.name && item.moderationStatus === 'approved'
      ),
    [contentItems, currentUser]
  )

  const inReview = useMemo(
    () => pendingSubmissions.filter((s) => s.creatorName === currentUser?.name),
    [pendingSubmissions, currentUser]
  )

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to see your projects</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  if (!currentUser.isCreator) {
    return (
      <div className="explore-page">
        <h1 className="deck-heading">Projects</h1>
        <div className="deck-accent" aria-hidden="true" />
        <div className="page-empty-state">
          <UploadIcon size={26} color="currentColor" />
          <h2>Your uploaded work lives here</h2>
          <p>
            Apply as a creator to publish the finished work you never used, and take a share of the
            monthly pool every time it's downloaded.
          </p>
          <Link to="/become-creator" className="settings-btn settings-btn-primary">Become a Creator</Link>
        </div>
      </div>
    )
  }

  const totals = live.reduce(
    (acc, item) => ({
      appreciations: acc.appreciations + item.appreciations,
      views: acc.views + item.views,
    }),
    { appreciations: 0, views: 0 }
  )

  const showLive = filter === 'all' || filter === 'live'
  const showReview = filter === 'all' || filter === 'review'

  return (
    <div className="explore-page">
      <h1 className="deck-heading">Projects</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>
        {live.length} live · {inReview.length} in review · {formatCount(totals.views)} views ·{' '}
        {formatCount(totals.appreciations)} appreciations
      </p>

      <div className="projects-toolbar">
        <div className="explore-chip-row" style={{ padding: 0, margin: 0 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filter === f.id ? 'explore-chip explore-chip-active' : 'explore-chip'}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link to="/upload" className="settings-btn settings-btn-primary">Upload work</Link>
      </div>

      {showReview && inReview.length > 0 && (
        <div className="project-group">
          <h2 className="project-group-title">In review</h2>
          {inReview.map((s) => (
            <div key={s.id} className="project-row">
              <span className="project-status project-status-review">Reviewing</span>
              <div className="download-info">
                <span className="download-title">{s.title}</span>
                <span className="download-meta">
                  {departmentLabel(s.department)}
                  {s.fileTypes.length > 0 ? ` · ${s.fileTypes.join(', ')}` : ''}
                </span>
              </div>
              <span className="download-when">
                Submitted {new Date(s.submittedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {showLive && (
        <div className="project-group">
          <h2 className="project-group-title">Live</h2>
          {live.length === 0 ? (
            <p className="explore-empty">Nothing live yet — your first approved upload shows up here.</p>
          ) : (
            live.map((item) => (
              <div key={item.id} className="project-row">
                <img src={item.image} alt="" className="download-thumb" />
                <div className="download-info">
                  <span className="download-title">{item.title}</span>
                  <span className="download-meta">
                    {departmentLabel(item.department)}
                    {item.free ? ' · Free' : ''}
                  </span>
                </div>
                <span className="project-stat">
                  <HeartIcon size={13} color="currentColor" />
                  {formatCount(item.appreciations)}
                </span>
                <span className="project-stat">
                  <EyeIcon size={13} color="currentColor" />
                  {formatCount(item.views)}
                </span>
                <Link to={`/design/${item.id}`} className="settings-btn">Open</Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
