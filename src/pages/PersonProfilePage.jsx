import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import FeedGrid from '../components/FeedGrid'
import { UserIcon } from '../components/icons'

function since(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

const SOCIAL_LABEL = { instagram: 'Instagram', linkedin: 'LinkedIn', website: 'Website', twitter: 'Twitter', x: 'X' }

export default function PersonProfilePage() {
  const { id } = useParams()
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

  return (
    <div className="creator-profile-page">
      <div className="creator-profile-header">
        <button
          type="button"
          className="creator-profile-avatar-btn"
          onClick={() => profile.image && setViewingPhoto(true)}
          aria-label={profile.image ? `View ${profile.name}'s profile picture` : undefined}
        >
          {profile.image ? (
            <img src={profile.image} alt={profile.name} className="creator-profile-avatar" />
          ) : (
            <span className="creator-profile-avatar creator-profile-avatar-fallback">
              <UserIcon size={28} color="currentColor" />
            </span>
          )}
        </button>
        <div>
          <h1>{profile.name || 'Routicle member'}</h1>
          <p className="creator-profile-specialty">
            {profile.isCreator && profile.specialty ? `${profile.specialty} · ` : ''}
            {profile.isCreator && profile.location ? `${profile.location} · ` : ''}
            Member since {since(profile.memberSince)}
          </p>
          {profile.isCreator && profile.bio && <p className="creator-profile-bio">{profile.bio}</p>}
          {socialLinks.length > 0 && (
            <div className="creator-profile-social">
              {socialLinks.map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noreferrer">{SOCIAL_LABEL[key] || key}</a>
              ))}
            </div>
          )}
        </div>
      </div>

      {profile.isCreator ? (
        profile.pieces.length > 0 ? (
          <>
            <div className="creator-profile-stats">
              <span><strong>{profile.pieces.reduce((s, p) => s + p.appreciations, 0)}</strong> appreciations</span>
              <span><strong>{profile.pieces.length}</strong> upload{profile.pieces.length === 1 ? '' : 's'}</span>
            </div>
            <FeedGrid items={profile.pieces} />
          </>
        ) : (
          <p className="explore-empty">No approved uploads yet.</p>
        )
      ) : (
        <p className="explore-empty">This member hasn't published any work yet.</p>
      )}

      {viewingPhoto && profile.image && (
        <div className="photo-lightbox" onClick={() => setViewingPhoto(false)}>
          <img src={profile.image} alt={profile.name} />
        </div>
      )}
    </div>
  )
}
