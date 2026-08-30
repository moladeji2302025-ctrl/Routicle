import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getCreatorById } from '../data/creators'
import FeedGrid from '../components/FeedGrid'

export default function CreatorProfilePage() {
  const { id } = useParams()
  const { currentUser, contentItems, toggleFollow } = useApp()
  const creator = getCreatorById(id)

  if (!creator) {
    return (
      <div className="detail-page detail-not-found">
        <h1>Creator not found</h1>
        <Link to="/" className="btn-hero-primary">Back to Routicle</Link>
      </div>
    )
  }

  const pieces = contentItems.filter((item) => item.creator === creator.name && item.moderationStatus === 'approved')
  const totalAppreciations = pieces.reduce((sum, item) => sum + item.appreciations, 0)
  const following = currentUser?.followingCreatorIds.includes(creator.id)
  const followerCount = 40 + (following ? 1 : 0)

  function handleShare() {
    if (navigator.clipboard) navigator.clipboard.writeText(window.location.href).catch(() => {})
  }

  return (
    <div className="creator-profile-page">
      <div className="creator-profile-header">
        <img src={creator.avatar} alt={creator.name} className="creator-profile-avatar" />
        <div>
          <h1>{creator.name}</h1>
          <p className="creator-profile-specialty">{creator.specialty} · {creator.location}</p>
          <p className="creator-profile-bio">{creator.bio}</p>
          <div className="creator-profile-social">
            <a href={creator.social.instagram}>Instagram</a>
            <a href={creator.social.linkedin}>LinkedIn</a>
            <a href={creator.social.website}>Website</a>
          </div>
        </div>
        <div className="creator-profile-actions">
          <button
            type="button"
            className={following ? 'btn-hero-primary' : 'btn-hero-secondary'}
            onClick={() => toggleFollow(creator.id)}
          >
            {following ? 'Following' : 'Follow'}
          </button>
          <button type="button" className="btn-hero-secondary" onClick={handleShare}>Share</button>
        </div>
      </div>

      <div className="creator-profile-stats">
        <span><strong>{followerCount}</strong> followers</span>
        <span><strong>{totalAppreciations}</strong> appreciations</span>
        <span><strong>{pieces.length}</strong> uploads</span>
      </div>

      {pieces.length > 0 ? <FeedGrid items={pieces} /> : <p className="explore-empty">No approved uploads yet.</p>}
    </div>
  )
}
