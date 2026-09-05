import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CREATORS, getCreatorByName } from '../data/creators'
import { applyBrowsingFilters } from '../data/settings'
import FeedGrid from '../components/FeedGrid'
import { UsersIcon } from '../components/icons'

export default function FollowingPage() {
  const { currentUser, contentItems, settings, toggleFollow } = useApp()
  const navigate = useNavigate()

  const followed = useMemo(
    () => CREATORS.filter((c) => currentUser?.followingCreatorIds?.includes(c.id)),
    [currentUser]
  )

  // Newest first, so this reads as a feed of what's happened since you last looked.
  const work = useMemo(() => {
    if (!currentUser) return []
    const names = new Set(followed.map((c) => c.name))
    return applyBrowsingFilters(
      contentItems.filter((item) => item.moderationStatus === 'approved' && names.has(item.creator)),
      settings.browsing
    ).sort((a, b) => Number(b.id) - Number(a.id))
  }, [contentItems, followed, currentUser, settings.browsing])

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to follow creators</h1>
        <p>Following someone puts their new work at the top of this page.</p>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  return (
    <div className="explore-page">
      <h1 className="deck-heading">Following</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>
        {followed.length === 0
          ? "You're not following anyone yet."
          : `${followed.length} creator${followed.length === 1 ? '' : 's'} · ${work.length} piece${work.length === 1 ? '' : 's'}`}
      </p>

      {followed.length > 0 && (
        <div className="following-strip">
          {followed.map((c) => (
            <div key={c.id} className="following-chip">
              <Link to={`/creator/${c.id}`} className="following-chip-id">
                <img src={c.avatar} alt="" className="following-chip-avatar" />
                <span>
                  <strong>{c.name}</strong>
                  <em>{c.specialty}</em>
                </span>
              </Link>
              <button type="button" className="following-unfollow" onClick={() => toggleFollow(c.id)}>
                Unfollow
              </button>
            </div>
          ))}
        </div>
      )}

      {followed.length === 0 ? (
        <div className="page-empty-state">
          <UsersIcon size={26} color="currentColor" />
          <h2>Follow the people whose work you keep coming back to</h2>
          <p>Their new uploads land here, and get weighted higher everywhere else you browse.</p>
          <Link to="/explore" className="settings-btn settings-btn-primary">Find creators</Link>
        </div>
      ) : work.length === 0 ? (
        <p className="explore-empty">Nobody you follow has anything live yet.</p>
      ) : (
        <FeedGrid items={work} />
      )}
    </div>
  )
}
