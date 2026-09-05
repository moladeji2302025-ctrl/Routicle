import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TIERS } from '../data/pricing'

const CYCLE_LABEL = { monthly: 'billed monthly', annual: 'billed annually' }
const STATUS_LABEL = {
  active: 'Active',
  canceled: 'Canceled',
  past_due: 'Payment failed',
  pending: 'Pending',
}

export default function AccountPage() {
  const { currentUser, subscription, activeTeam, signOut, devSetUser, cancelSubscription } = useApp()
  const navigate = useNavigate()
  const [canceling, setCanceling] = useState(false)
  const [billingError, setBillingError] = useState('')

  async function handleCancel() {
    setBillingError('')
    setCanceling(true)
    try {
      await cancelSubscription()
    } catch (err) {
      setBillingError(err.message)
    } finally {
      setCanceling(false)
    }
  }

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
          {subscription ? (
            <>
              <p className="dashboard-note">
                <strong>{TIERS[subscription.tier]?.label || subscription.tier}</strong>
                {' · '}
                {CYCLE_LABEL[subscription.billingCycle]}
                {' · '}
                {STATUS_LABEL[subscription.status] || subscription.status}
                {activeTeam ? ` · team plan for ${activeTeam.name}` : ''}
              </p>
              {subscription.currentPeriodEnd && (
                <p className="dashboard-note">
                  {subscription.status === 'canceled' ? 'Access until' : 'Renews'}{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  {subscription.status === 'active' && !subscription.isRecurring && ' (one-off payment — renew manually)'}
                </p>
              )}
            </>
          ) : (
            <p className="dashboard-note">Free · browsing and free-marked downloads only</p>
          )}
          {billingError && <p className="pricing-error">{billingError}</p>}
          <div className="account-demo-row">
            <button type="button" className="btn-hero-secondary" onClick={() => navigate('/pricing')}>
              {subscription ? 'Change plan' : 'See plans'}
            </button>
            {subscription?.status === 'active' && (
              <button type="button" className="btn-hero-secondary" onClick={handleCancel} disabled={canceling}>
                {canceling ? 'Canceling…' : 'Cancel plan'}
              </button>
            )}
          </div>

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
            <button type="button" className="account-demo-btn" onClick={() => devSetUser({ role: 'free', billingMode: 'monthly' })}>Free</button>
            <button type="button" className="account-demo-btn" onClick={() => devSetUser({ role: 'standard', credits: { image: 50, video: 0 } })}>Standard</button>
            <button type="button" className="account-demo-btn" onClick={() => devSetUser({ role: 'express', credits: { image: 50, video: 60 } })}>Express</button>
          </div>
          <div className="account-demo-row">
            <button type="button" className="account-demo-btn" onClick={() => devSetUser({ isCreator: !currentUser.isCreator })}>
              {currentUser.isCreator ? 'Remove creator status' : 'Grant creator status'}
            </button>
            <button type="button" className="account-demo-btn" onClick={() => devSetUser({ isAdmin: !currentUser.isAdmin })}>
              {currentUser.isAdmin ? 'Remove admin' : 'Grant admin'}
            </button>
          </div>

          <h3 className="dashboard-panel-spacer">Session</h3>
          <button type="button" className="btn-hero-secondary" onClick={async () => { await signOut(); navigate('/') }}>Sign out</button>
        </div>
      </div>
    </div>
  )
}
