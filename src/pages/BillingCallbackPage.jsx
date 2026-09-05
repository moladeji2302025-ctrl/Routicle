import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TIERS } from '../data/pricing'

/**
 * Where Paystack sends the buyer back to. Verifies the reference server-side,
 * then reflects the result. The webhook is what ultimately decides billing
 * state, so a "still processing" answer here isn't a failure — it just means
 * the gateway hasn't finalised yet.
 */
export default function BillingCallbackPage() {
  const [params] = useSearchParams()
  const reference = params.get('reference') || params.get('trxref')
  const { confirmPayment, applyPlanCredits } = useApp()
  const navigate = useNavigate()
  const [state, setState] = useState('verifying')
  const [subscription, setSubscription] = useState(null)
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!reference) {
      setState('error')
      setError('No payment reference was returned.')
      return
    }

    confirmPayment(reference)
      .then((result) => {
        if (result.status === 'success') {
          setSubscription(result.subscription)
          if (result.subscription?.tier) applyPlanCredits(result.subscription.tier)
          setState('success')
        } else {
          setState('pending')
        }
      })
      .catch((err) => {
        setState('error')
        setError(err.message)
      })
  }, [reference, confirmPayment, applyPlanCredits])

  const planLabel = subscription?.tier ? TIERS[subscription.tier]?.label : null

  return (
    <div className="billing-callback">
      {state === 'verifying' && (
        <>
          <div className="billing-spinner" aria-hidden="true" />
          <h1>Confirming your payment…</h1>
          <p>Hang on a moment — we're checking with the payment provider.</p>
        </>
      )}

      {state === 'success' && (
        <>
          <div className="billing-check" aria-hidden="true">✓</div>
          <h1>You're on {planLabel}</h1>
          <p>
            Your plan is active
            {subscription?.currentPeriodEnd
              ? ` through ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
              : ''}
            . Every source file at your tier is unlocked.
          </p>
          <div className="billing-callback-actions">
            <button type="button" className="hero-deck-btn-primary" onClick={() => navigate('/explore')}>
              Browse the library
            </button>
            <Link to="/account" className="hero-deck-btn-secondary">View billing</Link>
          </div>
        </>
      )}

      {state === 'pending' && (
        <>
          <h1>Payment still processing</h1>
          <p>
            The provider hasn't finalised this charge yet. If it goes through, your plan activates
            automatically — you don't need to pay again.
          </p>
          <Link to="/account" className="hero-deck-btn-secondary">Check billing status</Link>
        </>
      )}

      {state === 'error' && (
        <>
          <h1>We couldn't confirm that payment</h1>
          <p className="billing-callback-error">{error}</p>
          <p>If you were charged, it'll be reconciled automatically — nothing is lost.</p>
          <Link to="/pricing" className="hero-deck-btn-secondary">Back to pricing</Link>
        </>
      )}
    </div>
  )
}
