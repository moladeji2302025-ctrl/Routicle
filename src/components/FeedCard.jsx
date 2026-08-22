import { HeartIcon, EyeIcon, BookmarkIcon, PlayIcon } from './icons'
import { formatCount } from '../utils/format'

const watermarkUrl =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='170' height='170'><text x='-10' y='100' font-size='20' font-family='sans-serif' fill='%23ffffff' fill-opacity='0.3' transform='rotate(-28 85 85)'>ROUTICLE</text></svg>\")"

export default function FeedCard({ item }) {
  return (
    <div className="feed-card">
      <div className="feed-card-media">
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

        <div className="save-badge">
          <BookmarkIcon size={14} color="white" />
        </div>
      </div>

      <div className="feed-card-caption">
        <div className="caption-row">
          <div className="caption-title">{item.title}</div>
          <div className="caption-stats">
            <span className="stat">
              <HeartIcon size={12} color="currentColor" />
              {formatCount(item.appreciations)}
            </span>
            <span className="stat">
              <EyeIcon size={13} color="currentColor" />
              {formatCount(item.views)}
            </span>
          </div>
        </div>
        <div className="caption-bottom-row">
          <div className="caption-creator">
            <img src={item.avatar} alt={item.creator} className="avatar" />
            <span className="creator-name">{item.creator}</span>
          </div>
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
