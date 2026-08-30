import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TIERS } from '../data/pricing'

export default function AccountPage() {
  const { currentUser, signOut, devSetUser } = useApp()
  const navigate = useNavigate()

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to see your account</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <h1>Your account</h1>

      <div className="dashboard-grid">
        <div className="dashboard-panel">
          <h3>Plan</h3>
          <p className="dashboard-note">
            {TIERS[currentUser.role].label} · {currentUser.billingMode === 'payPerDownload' ? 'Pay-per-download' : `Monthly (${currentUser.billingCadence})`}
          </p>
          <button type="button" className="btn-hero-secondary" onClick={() => navigate('/pricing')}>Change plan</button>

          <h3 className="dashboard-panel-spacer">AI credits</h3>
          <p className="dashboard-note">{currentUser.credits.image} image · {currentUser.credits.video}s video remaining</p>

          <h3 className="dashboard-panel-spacer">Purchases</h3>
          {currentUser.purchasedItemIds.length === 0 ? (
            <p className="explore-empty">No pay-per-download purchases yet.</p>
          ) : (
            <p className="dashboard-note">{currentUser.purchasedItemIds.length} file(s) purchased</p>
          )}

          <h3 className="dashboard-panel-spacer">Collections</h3>
          <button type="button" className="btn-hero-secondary" onClick={() => navigate('/collections')}>
            View saved designs ({currentUser.savedItemIds.length})
          </button>
        </div>

        <div className="dashboard-panel">
          <h3>Demo controls</h3>
          <p className="dashboard-note">This is a prototype — switch roles instantly to preview gated screens.</p>
          <div className="account-demo-row">
            <button type="button" className="pricing-toggle-btn" onClick={() => devSetUser({ role: 'free', billingMode: 'monthly' })}>Free</button>
            <button type="button" className="pricing-toggle-btn" onClick={() => devSetUser({ role: 'standard', credits: { image: 50, video: 0 } })}>Standard</button>
            <button type="button" className="pricing-toggle-btn" onClick={() => devSetUser({ role: 'express', credits: { image: 50, video: 60 } })}>Express</button>
          </div>
          <div className="account-demo-row">
            <button type="button" className="pricing-toggle-btn" onClick={() => devSetUser({ isCreator: !currentUser.isCreator })}>
              {currentUser.isCreator ? 'Remove creator status' : 'Grant creator status'}
            </button>
            <button type="button" className="pricing-toggle-btn" onClick={() => devSetUser({ isAdmin: !currentUser.isAdmin })}>
              {currentUser.isAdmin ? 'Remove admin' : 'Grant admin'}
            </button>
          </div>

          <h3 className="dashboard-panel-spacer">Session</h3>
          <button type="button" className="btn-hero-secondary" onClick={() => { signOut(); navigate('/') }}>Sign out</button>
        </div>
      </div>
    </div>
  )
}
