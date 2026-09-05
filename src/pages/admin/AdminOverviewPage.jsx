import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'

const TIER_LABEL = { free: 'Free', standard: 'Standard', express: 'Express' }

function when(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

export default function AdminOverviewPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchAdminOverview()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="settings-error">{error}</p>
  if (!data) return <p className="explore-empty">Loading platform figures…</p>

  const { counts, subscriptionsByTier, recentDownloads, recentSubmissions } = data

  const stats = [
    { label: 'Accounts', value: counts.users, to: '/admin/users' },
    { label: 'Creators', value: counts.creators, to: '/admin/users' },
    { label: 'Live pieces', value: counts.liveContent, to: '/admin/content' },
    { label: 'Awaiting review', value: counts.pendingContent, to: '/admin/moderation', urgent: counts.pendingContent > 0 },
    { label: 'Downloads', value: counts.downloads },
    { label: 'Teams', value: counts.teams },
    { label: 'Team folders', value: counts.folders },
    { label: 'Published updates', value: counts.publishedUpdates, to: '/admin/updates' },
    { label: 'Draft updates', value: counts.draftUpdates, to: '/admin/updates' },
    { label: 'Resources', value: counts.resources, to: '/admin/resources' },
  ]

  return (
    <>
      <div className="admin-stat-grid">
        {stats.map((s) => {
          const inner = (
            <>
              <span className={s.urgent ? 'admin-stat-value admin-stat-value-urgent' : 'admin-stat-value'}>
                {s.value}
              </span>
              <span className="admin-stat-label">{s.label}</span>
            </>
          )
          return s.to ? (
            <Link key={s.label} to={s.to} className="admin-stat">{inner}</Link>
          ) : (
            <div key={s.label} className="admin-stat">{inner}</div>
          )
        })}
      </div>

      <section className="admin-section">
        <h2>Active subscriptions</h2>
        {subscriptionsByTier.length === 0 ? (
          <p className="explore-empty">No active subscriptions yet.</p>
        ) : (
          <div className="admin-tier-row">
            {subscriptionsByTier.map((t) => (
              <div key={t.tier} className="admin-tier">
                <span className="admin-stat-value">{t.count}</span>
                <span className="admin-stat-label">{TIER_LABEL[t.tier] || t.tier}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-two-col">
        <section className="admin-section">
          <h2>Waiting for review</h2>
          {recentSubmissions.length === 0 ? (
            <p className="explore-empty">Queue is clear.</p>
          ) : (
            <div className="download-list">
              {recentSubmissions.map((s) => (
                <div key={s.id} className="download-row">
                  <div className="download-info">
                    <span className="download-title">{s.title}</span>
                    <span className="download-meta">{s.creatorName}</span>
                  </div>
                  <span className="download-when">{when(s.at)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="settings-actions">
            <Link to="/admin/moderation" className="settings-btn">Open the queue</Link>
          </div>
        </section>

        <section className="admin-section">
          <h2>Latest downloads</h2>
          {recentDownloads.length === 0 ? (
            <p className="explore-empty">Nothing downloaded yet.</p>
          ) : (
            <div className="download-list">
              {recentDownloads.map((d, i) => (
                <div key={i} className="download-row">
                  <div className="download-info">
                    <span className="download-title">{d.title}</span>
                    <span className="download-meta">{d.userEmail}</span>
                  </div>
                  <span className="download-when">{when(d.at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
