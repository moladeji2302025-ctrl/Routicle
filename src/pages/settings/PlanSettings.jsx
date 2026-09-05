import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { TIERS, payPerDownloadPrice } from '../../data/pricing'
import { Section, Row, Toggle, Segmented, Feedback } from '../../components/settings/SettingsControls'

const CYCLE_LABEL = { monthly: 'billed monthly', annual: 'billed annually' }
const STATUS_LABEL = {
  active: 'Active',
  canceled: 'Canceled',
  past_due: 'Payment failed',
  pending: 'Pending',
}

const BILLING_MODES = [
  { id: 'subscription', label: 'Subscription' },
  { id: 'payPerDownload', label: 'Pay per download' },
]

function money(n) {
  return `$${Number(n).toFixed(2)}`
}

// Read the real prices off the pricing rules rather than restating them here,
// so this copy can't drift if the per-download rates change.
const STANDARD_PRICE = payPerDownloadPrice({ fileTypes: ['PSD'] })
const EXPRESS_PRICE = payPerDownloadPrice({ fileTypes: ['AEP'] })

export default function PlanSettings() {
  const { currentUser, subscription, activeTeam, cancelSubscription, setBillingMode, contentItems } = useApp()
  const navigate = useNavigate()
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const tier = subscription?.tier || 'free'
  const plan = TIERS[tier]
  const mode = currentUser.billingMode || 'subscription'

  const purchases = currentUser.purchasedItemIds
    .map((id) => contentItems.find((item) => item.id === id))
    .filter(Boolean)

  async function handleCancel() {
    setError('')
    setNotice('')
    setCanceling(true)
    try {
      await cancelSubscription()
      setNotice('Plan canceled. You keep access until the end of the paid period.')
    } catch (err) {
      setError(err.message)
    } finally {
      setCanceling(false)
    }
  }

  return (
    <>
      <Section
        title="Current plan"
        description={activeTeam ? `Billing shown is for the ${activeTeam.name} workspace.` : 'Billing shown is for your personal workspace.'}
      >
        <Row
          title={plan?.label || 'Free'}
          description={
            subscription
              ? `${CYCLE_LABEL[subscription.billingCycle]} · ${STATUS_LABEL[subscription.status] || subscription.status}`
              : 'Browse everything; source files stay locked.'
          }
        >
          <div className="settings-inline-actions">
            <Link to="/pricing" className="settings-btn settings-btn-primary">
              {subscription ? 'Change plan' : 'See plans'}
            </Link>
            {subscription?.status === 'active' && (
              <button type="button" className="settings-btn" onClick={handleCancel} disabled={canceling}>
                {canceling ? 'Canceling…' : 'Cancel'}
              </button>
            )}
          </div>
        </Row>

        {subscription?.currentPeriodEnd && (
          <Row
            title={subscription.status === 'canceled' ? 'Access ends' : 'Renews'}
            description={
              subscription.status === 'active' && !subscription.isRecurring
                ? 'One-off payment — this will not auto-renew.'
                : undefined
            }
          >
            <span className="settings-static-value">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          </Row>
        )}

        <Row title="Included credits" description="Reset each billing cycle.">
          <span className="settings-static-value">
            {currentUser.credits.image} image · {currentUser.credits.video}s video
          </span>
        </Row>

        <Feedback error={error} notice={notice} />
      </Section>

      <Section
        title="How downloads are charged"
        description="Switch to pay-per-download to keep your plan but pay for individual source files instead of using plan entitlement."
      >
        <Row
          title="Download billing"
          description={
            mode === 'payPerDownload'
              ? `Each file is charged separately — ${money(STANDARD_PRICE)} for Standard-tier work, ${money(EXPRESS_PRICE)} for Express.`
              : 'Files included in your plan download at no extra cost.'
          }
        >
          <Segmented name="Download billing" options={BILLING_MODES} value={mode} onChange={setBillingMode} />
        </Row>
        <Row title="Confirm before charging" description="Ask first whenever a download would cost money.">
          <ConfirmToggle />
        </Row>
      </Section>

      <Section title="Purchases" description="Files you bought individually. These stay downloadable forever.">
        {purchases.length === 0 ? (
          <p className="settings-row-desc">No pay-per-download purchases yet.</p>
        ) : (
          purchases.map((item) => (
            <div key={item.id} className="settings-list-row">
              <img src={item.image} alt="" className="settings-list-thumb" />
              <div className="settings-row-text">
                <span className="settings-row-title">{item.title}</span>
                <span className="settings-row-desc">{item.creator}</span>
              </div>
              <button type="button" className="settings-btn" onClick={() => navigate(`/design/${item.id}`)}>
                Open
              </button>
            </div>
          ))
        )}
      </Section>
    </>
  )
}

function ConfirmToggle() {
  const { settings, updateSettings } = useApp()
  return (
    <Toggle
      label="Confirm before charging"
      checked={settings.downloads.confirmPurchase}
      onChange={(confirmPurchase) => updateSettings('downloads', { confirmPurchase })}
    />
  )
}
