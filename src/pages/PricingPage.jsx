import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TIERS } from '../data/pricing'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    blurb: 'For browsing the library and seeing what’s in it.',
    monthly: 0,
    annual: 0,
    cta: 'Continue free',
    highlight: null,
  },
  {
    id: 'standard',
    name: 'Standard',
    blurb: 'For designers who want the real, editable source files.',
    monthly: TIERS.standard.monthly,
    annual: TIERS.standard.annual,
    cta: 'Get Standard',
    highlight: 'Most popular',
    spec: { label: '50 AI image generations', sub: 'Every month, on the Image Studio' },
  },
  {
    id: 'express',
    name: 'Express',
    blurb: 'For motion work — video projects and the Video Studio.',
    monthly: TIERS.express.monthly,
    annual: TIERS.express.annual,
    cta: 'Get Express',
    highlight: 'Full access',
    spec: { label: '50 images + 60s of AI video', sub: 'Every month, both Studios' },
  },
]

// Real capabilities only — each maps to something the app actually gates on.
const FEATURE_GROUPS = [
  {
    title: 'Library',
    rows: [
      { label: 'Browse every approved upload', free: true, standard: true, express: true },
      { label: 'Save to collections', free: true, standard: true, express: true },
      { label: 'Download items marked free', free: true, standard: true, express: true },
      { label: 'Watermark-free previews', free: false, standard: true, express: true },
    ],
  },
  {
    title: 'Source files',
    rows: [
      { label: 'PSD, AI & Canva working files', free: false, standard: true, express: true },
      { label: 'After Effects & Premiere Pro projects', free: false, standard: false, express: true },
      { label: 'Non-exclusive commercial use', free: false, standard: true, express: true },
    ],
  },
  {
    title: 'AI Studio',
    rows: [
      { label: 'AI Image Studio', free: false, standard: true, express: true },
      { label: 'AI Video Studio', free: false, standard: false, express: true },
      { label: 'Upscaling', free: false, standard: true, express: true },
    ],
  },
  {
    title: 'Workspace',
    rows: [
      { label: 'Shared team collections', free: false, standard: true, express: true },
      { label: 'Shared team download history', free: false, standard: true, express: true },
      { label: 'One plan covering every member', free: false, standard: true, express: true },
    ],
  },
]

/** $9 stays $9, but $22.5 has to read $22.50 — it's money. */
function money(amount) {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`
}

function Mark({ on }) {
  return on ? (
    <span className="pricing-mark pricing-mark-yes" aria-label="Included">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  ) : (
    <span className="pricing-mark pricing-mark-no" aria-label="Not included">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </span>
  )
}

export default function PricingPage() {
  const { currentUser, subscription, activeTeam, activeTeamId, startSubscriptionCheckout, cancelSubscription } = useApp()
  const navigate = useNavigate()
  const [scope, setScope] = useState(activeTeamId ? 'team' : 'individual')
  const [cadence, setCadence] = useState('annual')
  const [busyTier, setBusyTier] = useState(null)
  const [error, setError] = useState('')

  const currentTier = subscription?.tier || 'free'

  function priceFor(plan) {
    return cadence === 'annual' ? plan.annual : plan.monthly
  }

  async function handleChoose(plan) {
    setError('')

    if (!currentUser) {
      navigate('/signup')
      return
    }

    if (plan.id === 'free') {
      if (currentTier === 'free') return
      try {
        setBusyTier('free')
        await cancelSubscription()
      } catch (err) {
        setError(err.message)
      } finally {
        setBusyTier(null)
      }
      return
    }

    if (scope === 'team' && !activeTeamId) {
      navigate('/team')
      return
    }

    try {
      setBusyTier(plan.id)
      const url = await startSubscriptionCheckout({ tier: plan.id, cadence, returnUrl: '/account' })
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setBusyTier(null)
    }
  }

  return (
    <div className="pricing-page">
      <header className="pricing-hero">
        <h1 className="pricing-hero-title">Pick how you want to work</h1>
        <p className="pricing-hero-sub">
          Browsing is free forever. Pay only when you want the editable files behind the work — or
          the Studios to make your own.
        </p>
      </header>

      <div className="pricing-controls">
        <div className="pricing-segment" role="tablist" aria-label="Plan scope">
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'individual'}
            className={scope === 'individual' ? 'pricing-segment-btn pricing-segment-active' : 'pricing-segment-btn'}
            onClick={() => setScope('individual')}
          >
            Individual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'team'}
            className={scope === 'team' ? 'pricing-segment-btn pricing-segment-active' : 'pricing-segment-btn'}
            onClick={() => setScope('team')}
          >
            Teams
          </button>
        </div>

        <label className="pricing-cadence">
          <span className={cadence === 'monthly' ? 'pricing-cadence-on' : ''}>Monthly</span>
          <button
            type="button"
            role="switch"
            aria-checked={cadence === 'annual'}
            aria-label="Bill annually"
            className={cadence === 'annual' ? 'pricing-switch pricing-switch-on' : 'pricing-switch'}
            onClick={() => setCadence((c) => (c === 'annual' ? 'monthly' : 'annual'))}
          >
            <span className="pricing-switch-knob" />
          </button>
          <span className={cadence === 'annual' ? 'pricing-cadence-on' : ''}>Annual</span>
          <span className="pricing-save">Save 25%</span>
        </label>
      </div>

      {scope === 'team' && (
        <p className="pricing-scope-note">
          {activeTeam
            ? `Billed once for ${activeTeam.name} — every member gets the tier, shared collections, and shared download history.`
            : 'A team plan covers everyone in the workspace on one bill. Create a team first, then pick a tier.'}
        </p>
      )}

      {error && <p className="pricing-error">{error}</p>}

      <div className="pricing-grid">
        {PLANS.map((plan) => {
          const price = priceFor(plan)
          const isCurrent = currentTier === plan.id
          const featured = plan.id === 'standard'
          return (
            <section
              key={plan.id}
              className={featured ? 'pricing-card pricing-card-featured' : 'pricing-card'}
            >
              {plan.highlight && <span className="pricing-badge">{plan.highlight}</span>}

              <h2 className="pricing-card-name">{plan.name}</h2>
              <p className="pricing-card-blurb">{plan.blurb}</p>

              <div className="pricing-card-price">
                {plan.id === 'free' ? (
                  <span className="pricing-amount">$0</span>
                ) : (
                  <>
                    <span className="pricing-amount">{money(price)}</span>
                    <span className="pricing-per">
                      /month
                      <em>{cadence === 'annual' ? 'billed annually' : 'billed monthly'}</em>
                    </span>
                  </>
                )}
              </div>

              {plan.spec ? (
                <div className="pricing-spec">
                  <strong>{plan.spec.label}</strong>
                  <span>{plan.spec.sub}</span>
                </div>
              ) : (
                <div className="pricing-spec pricing-spec-muted">
                  <strong>No card needed</strong>
                  <span>Browse and save as much as you like</span>
                </div>
              )}

              <button
                type="button"
                className={
                  featured
                    ? 'pricing-cta pricing-cta-primary'
                    : isCurrent
                      ? 'pricing-cta pricing-cta-current'
                      : 'pricing-cta'
                }
                onClick={() => handleChoose(plan)}
                disabled={busyTier !== null || (isCurrent && plan.id !== 'free')}
              >
                {busyTier === plan.id ? 'Starting…' : isCurrent ? 'Current plan' : plan.cta}
              </button>
            </section>
          )
        })}
      </div>

      <div className="pricing-matrix">
        {FEATURE_GROUPS.map((group) => (
          <div key={group.title} className="pricing-matrix-group">
            <div className="pricing-matrix-head">
              <h3>{group.title}</h3>
              <span>Free</span>
              <span>Standard</span>
              <span>Express</span>
            </div>
            {group.rows.map((row) => (
              <div key={row.label} className="pricing-matrix-row">
                <span className="pricing-matrix-label">{row.label}</span>
                <Mark on={row.free} />
                <Mark on={row.standard} />
                <Mark on={row.express} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="pricing-foot">
        Prices in USD, charged securely via Paystack. Cancel anytime — access runs to the end of the
        period you've paid for. Half of every subscription dollar goes into the creator pool.
      </p>
    </div>
  )
}
