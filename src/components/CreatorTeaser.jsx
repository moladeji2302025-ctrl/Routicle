import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function CreatorTeaser({ item, onClose }) {
  const { currentUser } = useApp()
  const initial = item.creatorName.trim().charAt(0).toUpperCase()

  return (
    <div className="creator-teaser">
      <button type="button" className="creator-teaser-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="creator-teaser-avatar">{initial}</div>
      <div className="creator-teaser-name">{item.creatorName}</div>
      <div className="creator-teaser-specialty">{item.specialty}</div>

      {currentUser ? (
        <p className="creator-teaser-bio">{item.bio}</p>
      ) : (
        <>
          <p className="creator-teaser-bio creator-teaser-bio-locked">
            {item.bio.slice(0, 46)}…
          </p>
          <Link to="/signup" className="creator-teaser-cta">Sign in to see more</Link>
        </>
      )}
    </div>
  )
}
