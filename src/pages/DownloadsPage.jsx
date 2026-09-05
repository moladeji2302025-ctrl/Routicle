import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { departmentLabel } from '../data/departments'
import { fetchDownloads } from '../lib/api'
import { FolderIcon } from '../components/icons'

function when(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString()
}

export default function DownloadsPage() {
  const { currentUser, activeTeam, contentItems } = useApp()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null) // null = loading
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentUser) return undefined
    let cancelled = false
    setRows(null)
    setError('')
    fetchDownloads({ userEmail: currentUser.email, organizationId: activeTeam?.id })
      .then(({ downloads }) => !cancelled && setRows(downloads))
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [currentUser, activeTeam])

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to see your downloads</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  return (
    <div className="explore-page">
      <h1 className="deck-heading">{activeTeam ? `${activeTeam.name}'s Downloads` : 'Downloads'}</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>
        {activeTeam
          ? 'Every source file anyone on this team has taken. Shared, so nobody re-downloads what a colleague already has.'
          : 'Source files you have downloaded. Re-downloading is always free.'}
      </p>

      {error && <p className="settings-error">{error}</p>}
      {rows === null && <p className="explore-empty">Loading…</p>}

      {rows?.length === 0 && !error && (
        <div className="page-empty-state">
          <FolderIcon size={26} color="currentColor" />
          <h2>Nothing downloaded yet</h2>
          <p>Source files you take will be listed here with who took them and when.</p>
          <Link to="/explore" className="settings-btn settings-btn-primary">Browse the library</Link>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="download-list">
          {rows.map((row, i) => {
            // The local catalogue may not hold a server-side item, so fall back
            // to the columns the query already returned rather than blanking out.
            const item = contentItems.find((c) => String(c.id) === String(row.content_item_id))
            return (
              <div key={`${row.content_item_id}-${i}`} className="download-row">
                {item?.image && <img src={item.image} alt="" className="download-thumb" />}
                <div className="download-info">
                  <span className="download-title">{item?.title || row.title}</span>
                  <span className="download-meta">
                    {departmentLabel(item?.department || row.department)}
                    {activeTeam ? ` · ${row.user_email}` : ''}
                  </span>
                </div>
                <span className="download-when">{when(row.downloaded_at)}</span>
                {item && (
                  <Link to={`/design/${item.id}`} className="settings-btn">
                    Open
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
