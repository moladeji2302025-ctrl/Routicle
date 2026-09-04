import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import FeedGrid from '../components/FeedGrid'

export default function CollectionsPage() {
  const { currentUser, activeTeam, contentItems } = useApp()
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
      <h1 className="deck-heading">{activeTeam ? `${activeTeam.name}'s Collection` : 'Saved'}</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>
        {activeTeam
          ? 'Shared with everyone on this team — anyone can save or remove an item here.'
          : 'Only visible to you.'}
      </p>
      {saved.length === 0 ? (
        <p className="explore-empty">Nothing saved yet — tap the bookmark icon on any design to add it here.</p>
      ) : (
        <FeedGrid items={saved} />
      )}
    </div>
  )
}
