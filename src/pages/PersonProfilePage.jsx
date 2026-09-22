import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as api from '../lib/api'
import FeedGrid from '../components/FeedGrid'
import { UserIcon } from '../components/icons'

function since(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const SOCIAL_LABEL = { instagram: 'Instagram', linkedin: 'LinkedIn', website: 'Website', twitter: 'Twitter', x: 'X' }

// A handful of curated gradients, picked deterministically from the account
// id — every profile without a banner of its own still reads as a real
// person's page rather than a blank grey bar, and the same person always
// gets the same one.
const BANNERS = [
  'linear-gradient(135deg, #6750de 0%, #b199fd 100%)',
  'linear-gradient(135deg, #0c1f33 0%, #1f6f9e 60%, #6fc0d9 100%)',
  'linear-gradient(135deg, #2a0f0f 0%, #d9432f 60%, #f0906f 100%)',
  'linear-gradient(135deg, #14281d 0%, #2f9e63 60%, #8fd3ae 100%)',
  'linear-gradient(135deg, #2f2113 0%, #a9714b 60%, #d9b08c 100%)',
]

function bannerFor(id) {
  let hash = 0
  for (const ch of String(id || '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return BANNERS[hash % BANNERS.length]
}

export default function PersonProfilePage() {
  const { id } = useParams()
  const { currentUser } = useApp()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  // The picture-viewer lightbox only exists here, on the profile page itself
  // — everywhere else a small avatar appears it's just a link to this page,
  // not a second click target.
  const [viewingPhoto, setViewingPhoto] = useState(false)

  useEffect(() => {
    let cancelled = false
    setProfile(null)
    setError('')
    api
      .fetchPersonProfile(id)
      .then((data) => { if (!cancelled) setProfile(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [id])

  if (error) {
    return (
      <div className="detail-page detail-not-found">
        <h1>Profile not found</h1>
        <p>This account may not exist, or may have been removed.</p>
        <Link to="/" className="btn-hero-primary">Back to Routicle</Link>
      </div>
    )
  }

  if (!profile) {
    return <p className="explore-empty">Loading…</p>
  }

  const socialLinks = Object.entries(profile.social || {}).filter(([, url]) => url)
  const isOwn = currentUser?.id === profile.id
  const appreciationTotal = profile.pieces.reduce((s, p) => s + p.appreciations, 0)

  return (
    <div className="pp-page">
      <div className="pp-banner" style={{ background: bannerFor(profile.id) }}>
        <button
          type="button"
          className="pp-avatar-btn"
          onClick={() => profile.image && setViewingPhoto(true)}
          aria-label={profile.image ? `View ${profile.name}'s profile picture` : undefined}
        >
          {profile.image ? (
            <img src={profile.image} alt={profile.name} className="pp-avatar" />
          ) : (
            <span className="pp-avatar pp-avatar-fallback">
              <UserIcon size={30} color="currentColor" />
            </span>
          )}
        </button>
      </div>

      <div className="pp-layout">
        <aside className="pp-sidebar">
          <h1 className="pp-name">{profile.name || 'Routicle member'}</h1>
          {profile.isCreator && profile.location && (
            <p className="pp-location">{profile.location}</p>
          )}
          {profile.isCreator && profile.specialty && <p className="pp-specialty">{profile.specialty}</p>}

          {isOwn && (
            <Link to="/settings/profile" className="pp-edit-btn">Edit profile</Link>
          )}

          {profile.isCreator && profile.bio && <p className="pp-bio">{profile.bio}</p>}

          {socialLinks.length > 0 && (
            <div className="pp-social">
              {socialLinks.map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noreferrer">{SOCIAL_LABEL[key] || key}</a>
              ))}
            </div>
          )}

          {profile.isCreator && profile.pieces.length > 0 && (
            <div className="pp-stat-list">
              <div className="pp-stat-row">
                <span>Appreciations</span>
                <strong>{appreciationTotal}</strong>
              </div>
              <div className="pp-stat-row">
                <span>Uploads</span>
                <strong>{profile.pieces.length}</strong>
              </div>
            </div>
          )}

          <p className="pp-since">Member since {since(profile.memberSince)}</p>
        </aside>

        <main className="pp-main">
          <h2 className="pp-section-title">Work</h2>
          {profile.isCreator ? (
            profile.pieces.length > 0 ? (
              <FeedGrid items={profile.pieces} />
            ) : (
              <p className="explore-empty">No approved uploads yet.</p>
            )
          ) : (
            <p className="explore-empty">This member hasn't published any work yet.</p>
          )}
        </main>
      </div>

      {viewingPhoto && profile.image && (
        <div className="photo-lightbox" onClick={() => setViewingPhoto(false)}>
          <img src={profile.image} alt={profile.name} />
        </div>
      )}
    </div>
  )
}
