import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { analyticsEnabled, consentState, onConsentChange, pageView, setConsent } from '../lib/analytics'

/**
 * Asks once whether analytics may run, and reports a page view on every
 * route change after that. Renders nothing when GA isn't configured.
 */
export default function AnalyticsConsent() {
  const location = useLocation()
  const [consent, setConsentState] = useState(consentState)

  useEffect(() => onConsentChange(setConsentState), [])

  useEffect(() => {
    pageView(location.pathname + location.search)
  }, [location.pathname, location.search])

  if (!analyticsEnabled || consent) return null

  return (
    <div className="consent-bar" role="dialog" aria-live="polite" aria-label="Analytics cookies">
      <p>
        We'd like to use Google Analytics cookies to see which pages people use, so we know what to improve. Nothing is
        sent unless you say yes.
      </p>
      <div className="consent-actions">
        <button type="button" className="consent-no" onClick={() => setConsent(false)}>
          No thanks
        </button>
        <button type="button" className="consent-yes" onClick={() => setConsent(true)}>
          Allow
        </button>
      </div>
    </div>
  )
}
