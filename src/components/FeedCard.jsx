import { Link, useNavigate } from 'react-router-dom'
import { HeartIcon, EyeIcon, BookmarkIcon, PlayIcon } from './icons'
import { formatCount } from '../utils/format'
import { useApp } from '../context/AppContext'
import { getCreatorByName } from '../data/creators'

const watermarkUrl =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='170' height='170'><text x='-10' y='100' font-size='20' font-family='sans-serif' fill='%23ffffff' fill-opacity='0.3' transform='rotate(-28 85 85)'>ROUTICLE</text></svg>\")"

export default function FeedCard({ item }) {
  const { currentUser, toggleAppreciate, toggleSave } = useApp()
  const navigate = useNavigate()
  const creator = getCreatorByName(item.creator)

  const appreciated = currentUser?.appreciatedItemIds.includes(item.id)
  const saved = currentUser?.savedItemIds.includes(item.id)

  function requireAuth(action) {
    return (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (!currentUser) {
        navigate('/signup')
        return
      }
      action()
    }
  }

  return (
    <div className="feed-card">
      <Link to={`/design/${item.id}`} className="feed-card-media">
        <img src={item.image} alt={item.title} className="feed-card-image" />

        {!item.free && (
          <div className="feed-card-watermark" style={{ backgroundImage: watermarkUrl }} />
        )}

        {item.free && (
          <div className="feed-card-top">
            <span className="tag tag-free">Free</span>
          </div>
        )}

        {item.hasVideo && (
          <div className="play-badge">
            <PlayIcon size={10} color="white" />
          </div>
        )}

        <button
          type="button"
          className={saved ? 'save-badge save-badge-active' : 'save-badge'}
          onClick={requireAuth(() => toggleSave(item.id))}
          aria-label={saved ? 'Remove from collection' : 'Save to collection'}
        >
          <BookmarkIcon size={14} color="white" />
        </button>
      </Link>

      <div className="feed-card-caption">
        <div className="caption-row">
          <Link to={`/design/${item.id}`} className="caption-title">{item.title}</Link>
          <div className="caption-stats">
            <button
              type="button"
              className={appreciated ? 'stat stat-button stat-active' : 'stat stat-button'}
              onClick={requireAuth(() => toggleAppreciate(item.id))}
            >
              <HeartIcon size={12} color="currentColor" />
              {formatCount(item.appreciations)}
            </button>
            <span className="stat">
              <EyeIcon size={13} color="currentColor" />
              {formatCount(item.views)}
            </span>
          </div>
        </div>
        <div className="caption-bottom-row">
          <Link to={creator ? `/creator/${creator.id}` : '#'} className="caption-creator">
            <img src={item.avatar} alt={item.creator} className="avatar" />
            <span className="creator-name">{item.creator}</span>
          </Link>
          {item.fileTypes.length > 0 && (
            <div className="filetype-row">
              {item.fileTypes.map((ft) => (
                <span key={ft} className="filetype-badge">{ft}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
