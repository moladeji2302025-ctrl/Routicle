import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SearchIcon, GridIcon, ImageIcon, VideoIcon, UploadIcon, FolderIcon, StarIcon } from '../components/icons'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const TOOLS = [
  { label: 'Explore', to: '/explore', icon: GridIcon },
  { label: 'AI Image', to: '/studio/image', icon: ImageIcon },
  { label: 'AI Video', to: '/studio/video', icon: VideoIcon },
  { label: 'Collections', to: '/collections', icon: FolderIcon },
  { label: 'Pricing', to: '/pricing', icon: StarIcon },
]

export default function AppHomePage() {
  const { currentUser, contentItems } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const savedItems = useMemo(
    () => contentItems.filter((item) => currentUser?.savedItemIds.includes(item.id)).slice(0, 5),
    [contentItems, currentUser]
  )

  function handleSearchSubmit(event) {
    event.preventDefault()
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore')
  }

  const tools = currentUser?.isCreator
    ? [...TOOLS.slice(0, 3), { label: 'Upload', to: '/upload', icon: UploadIcon }, ...TOOLS.slice(3)]
    : TOOLS

  return (
    <div className="app-home">
      <h1 className="app-home-greeting">{greeting()}, {currentUser?.name?.split(' ')[0] || 'there'}!</h1>

      <form className="app-home-search" onSubmit={handleSearchSubmit}>
        <SearchIcon size={16} color="currentColor" />
        <input
          type="text"
          placeholder="Search Routicle — designs, creators, formats…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <div className="app-tool-grid">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Link key={tool.label} to={tool.to} className="app-tool-tile">
              <span className="app-tool-tile-icon">
                <Icon size={20} color="currentColor" />
              </span>
              <span className="app-tool-tile-label">{tool.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="app-panel-row">
        <div className="app-panel">
          <div className="app-panel-head">
            <h3>Your Collections</h3>
            <Link to="/collections">View all</Link>
          </div>
          {savedItems.length > 0 ? (
            <div className="app-collection-list">
              {savedItems.map((item) => (
                <Link key={item.id} to={`/design/${item.id}`} className="app-collection-row">
                  <img src={item.image} alt="" className="app-collection-thumb" />
                  <span className="app-collection-title">{item.title}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="app-panel-empty">
              <FolderIcon size={22} color="currentColor" />
              Nothing saved yet — bookmark a design in Explore to see it here.
            </div>
          )}
        </div>

        {currentUser?.isCreator ? (
          <div className="app-panel app-cta-panel">
            <div className="app-panel-head">
              <h3>Your Dashboard</h3>
            </div>
            <p className="app-cta-desc">
              {currentUser.allTimeEarnings > 0
                ? `You've earned $${currentUser.allTimeEarnings.toFixed(2)} all-time. Check your latest stats and payouts.`
                : 'Track your earnings, referrals, and payouts once subscribers start downloading your work.'}
            </p>
            <Link to="/dashboard" className="app-cta-btn">Open dashboard</Link>
          </div>
        ) : (
          <div className="app-panel app-cta-panel">
            <div className="app-panel-head">
              <h3>Sell your work</h3>
            </div>
            <p className="app-cta-desc">
              Upload finished designs and video you never got to use. Subscribers download the files, you get paid
              every month — non-exclusive, no strings attached.
            </p>
            <Link to="/become-creator" className="app-cta-btn">Become a Creator</Link>
          </div>
        )}
      </div>
    </div>
  )
}
