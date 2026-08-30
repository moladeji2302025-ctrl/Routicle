import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import FeedGrid from '../components/FeedGrid'

export default function CollectionsPage() {
  const { currentUser, contentItems } = useApp()
  const navigate = useNavigate()

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to see your collections</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  const saved = contentItems.filter((item) => currentUser.savedItemIds.includes(item.id))

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1 className="explore-title">Saved</h1>
      </div>
      {saved.length === 0 ? (
        <p className="explore-empty">Nothing saved yet — tap the bookmark icon on any design to add it here.</p>
      ) : (
        <FeedGrid items={saved} />
      )}
    </div>
  )
}
