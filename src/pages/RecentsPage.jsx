import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { applyBrowsingFilters } from '../data/settings'
import FeedGrid from '../components/FeedGrid'

/**
 * Everything the signed-in account has opened, most recent first.
 *
 * The dashboard's "Pick up where you left off" shows the latest five; this is
 * the rest. It reads the same history the design pages write, so it honours
 * the privacy setting that stops it being collected.
 */
export default function RecentsPage() {
  const { currentUser, contentItems, recentlyViewed, settings, clearRecentlyViewed } = useApp()
  const navigate = useNavigate()

  const items = useMemo(() => {
    const approved = applyBrowsingFilters(
      contentItems.filter((item) => item.moderationStatus === 'approved'),
      settings.browsing
    )
    // Kept in visit order. A piece that has since been removed simply drops out.
    return recentlyViewed.map((id) => approved.find((i) => String(i.id) === String(id))).filter(Boolean)
  }, [recentlyViewed, contentItems, settings.browsing])

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to see your recents</h1>
        <p>Pieces you open are remembered here, so you can pick up where you left off.</p>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signin')}>Sign in</button>
      </div>
    )
  }

  const historyOff = settings.privacy.saveRecentlyViewed === false

  return (
    <div className="explore-page">
      <h1 className="deck-heading">Recents</h1>
      <div className="deck-accent" aria-hidden="true" />

      <div className="projects-toolbar" style={{ marginTop: 18 }}>
        <p className="explore-count" style={{ margin: 0 }}>
          {items.length === 0 ? 'Nothing viewed yet.' : `${items.length} piece${items.length === 1 ? '' : 's'} you've viewed, most recent first`}
        </p>
        {items.length > 0 && (
          <button type="button" className="settings-btn settings-btn-ghost" onClick={clearRecentlyViewed}>
            Clear history
          </button>
        )}
      </div>

      {historyOff && (
        <p className="explore-empty">
          Recent history is switched off, so new views aren't being saved. You can turn it back on in{' '}
          <Link to="/settings/privacy">Settings &gt; Privacy</Link>.
        </p>
      )}

      {items.length === 0 ? (
        !historyOff && (
          <p className="explore-empty">
            Open a design and it will appear here. <Link to="/explore">Explore the library</Link>.
          </p>
        )
      ) : (
        <FeedGrid items={items} />
      )}
    </div>
  )
}
