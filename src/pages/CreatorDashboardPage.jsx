import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatCount } from '../utils/format'

export default function CreatorDashboardPage() {
  const { currentUser, contentItems } = useApp()
  const navigate = useNavigate()

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to see your dashboard</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  if (!currentUser.isCreator) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>You're not a creator yet</h1>
        <p>Apply to become a creator to start uploading and earning.</p>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/become-creator')}>Become a Creator</button>
      </div>
    )
  }

  const myPieces = contentItems.filter((item) => item.creator === currentUser.name)
  const totalAppreciations = myPieces.reduce((sum, item) => sum + item.appreciations, 0)
  const totalViews = myPieces.reduce((sum, item) => sum + item.views, 0)

  return (
    <div className="dashboard-page">
      <h1>Creator dashboard</h1>
      <p className="dashboard-subtitle">Your own numbers only — never platform totals.</p>

      <div className="dashboard-stats-row">
        <div className="dashboard-stat">
          <span className="dashboard-stat-value">${currentUser.earningsThisMonth.toFixed(2)}</span>
          <span className="dashboard-stat-label">Earnings this month</span>
        </div>
        <div className="dashboard-stat">
          <span className="dashboard-stat-value">${currentUser.allTimeEarnings.toFixed(2)}</span>
          <span className="dashboard-stat-label">All-time earnings</span>
        </div>
        <div className="dashboard-stat">
          <span className="dashboard-stat-value">{myPieces.length}</span>
          <span className="dashboard-stat-label">Live pieces</span>
        </div>
        <div className="dashboard-stat">
          <span className="dashboard-stat-value dashboard-eligible">Active</span>
          <span className="dashboard-stat-label">Pool eligibility</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-panel">
          <h3>Your pieces</h3>
          {myPieces.length === 0 && <p className="explore-empty">Nothing live yet — upload your first piece.</p>}
          {myPieces.map((item) => (
            <div key={item.id} className="dashboard-piece-row">
              <img src={item.image} alt={item.title} />
              <div>
                <div className="dashboard-piece-title">{item.title}</div>
                <div className="dashboard-piece-meta">
                  {formatCount(item.appreciations)} appreciations · {formatCount(item.views)} views
                </div>
              </div>
            </div>
          ))}
          <p className="dashboard-note">
            Totals across your library: {formatCount(totalAppreciations)} appreciations, {formatCount(totalViews)} views.
          </p>
        </div>

        <div className="dashboard-panel">
          <h3>Referral</h3>
          <p>Share your link — earn a one-time $15 bonus once a referred signup's first payment clears.</p>
          <div className="dashboard-referral-code">routicle.app/r/{currentUser.referralCode}</div>
          <p className="dashboard-note">{currentUser.referralCount} referrals · ${currentUser.referralEarnings.toFixed(2)} earned</p>

          <h3 className="dashboard-panel-spacer">Payout method</h3>
          <p className="dashboard-note">{currentUser.payoutMethod || 'No payout method on file yet.'}</p>

          <h3 className="dashboard-panel-spacer">Payout history</h3>
          {currentUser.payoutHistory.length === 0 ? (
            <p className="explore-empty">No payouts yet — accrues once your balance crosses $50.</p>
          ) : (
            currentUser.payoutHistory.map((p, i) => <p key={i} className="dashboard-note">{p}</p>)
          )}
        </div>
      </div>
    </div>
  )
}
