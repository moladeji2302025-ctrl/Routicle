/**
 * Google Analytics 4, loaded only after the visitor agrees to it.
 *
 * Nothing is sent and no cookie is set until consent is given: gtag.js isn't
 * even fetched before then. Analytics cookies can't be httpOnly (the script
 * has to read them), so keeping them off until someone opts in is the only
 * honest way to run them under NDPR and GDPR.
 *
 * With no VITE_GA_MEASUREMENT_ID configured every call here is a no-op, so
 * local builds and previews never report anything.
 *
 * The events that matter are the conversions below. Page views are sent by
 * hand on each route change because this is a single page app.
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''
const CONSENT_KEY = 'routicle.analytics-consent' // 'granted' | 'denied'
const SENT_KEY = 'routicle.analytics-sent' // one-off events already reported

let loaded = false
const listeners = new Set()

export const analyticsEnabled = Boolean(MEASUREMENT_ID)

function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode or blocked storage: consent just won't be remembered.
  }
}

export function consentState() {
  const v = readStorage(CONSENT_KEY)
  return v === 'granted' || v === 'denied' ? v : null
}

export function onConsentChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function gtag() {
  window.dataLayer.push(arguments) // gtag.js expects the arguments object itself
}

function load() {
  if (loaded || !analyticsEnabled) return
  loaded = true
  window.dataLayer = window.dataLayer || []
  window.gtag = gtag
  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  gtag('js', new Date())
  gtag('config', MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true })

  // An external script, so the CSP needs no 'unsafe-inline' for it.
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`
  document.head.appendChild(s)
}

export function setConsent(granted) {
  writeStorage(CONSENT_KEY, granted ? 'granted' : 'denied')
  if (granted) {
    load()
    pageView()
  } else if (loaded) {
    // Stop anything further and clear what was set. The script stays in
    // memory until the next page load, but it won't send another hit.
    window.gtag('consent', 'update', { analytics_storage: 'denied' })
    window[`ga-disable-${MEASUREMENT_ID}`] = true
    const domain = location.hostname
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim()
      if (name === '_ga' || name.startsWith('_ga_')) {
        document.cookie = `${name}=; Max-Age=0; path=/`
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`
      }
    }
  }
  listeners.forEach((fn) => fn(consentState()))
}

/** Call once at startup: picks up consent given on an earlier visit. */
export function initAnalytics() {
  if (consentState() === 'granted') load()
}

function canSend() {
  return analyticsEnabled && loaded && consentState() === 'granted' && !window[`ga-disable-${MEASUREMENT_ID}`]
}

export function track(name, params = {}) {
  if (!canSend()) return
  window.gtag('event', name, params)
}

/** An event that must only ever count once per browser, e.g. keyed by a payment reference. */
function trackOnce(key, name, params) {
  if (!canSend()) return
  let sent = []
  try {
    sent = JSON.parse(readStorage(SENT_KEY) || '[]')
  } catch {
    sent = []
  }
  if (sent.includes(key)) return
  track(name, params)
  writeStorage(SENT_KEY, JSON.stringify([...sent, key].slice(-50)))
}

export function pageView(path = location.pathname + location.search) {
  track('page_view', { page_path: path, page_location: location.href, page_title: document.title })
}

/* ---- Conversions. Mark each of these as a key event in the GA4 admin. ---- */

export function trackSignUp(userId, method) {
  trackOnce(`signup:${userId}`, 'sign_up', { method })
}

export function trackSubscriptionStart({ reference, tier, billingCycle, amount, currency }) {
  const params = {
    transaction_id: reference,
    value: Number(amount) || 0,
    currency: currency || 'USD',
    tier,
    billing_cycle: billingCycle,
    items: [{ item_id: `${tier}-${billingCycle}`, item_name: `${tier} plan`, item_category: 'subscription' }],
  }
  // `purchase` feeds GA's built-in revenue reports; `subscription_start`
  // carries the tier as its own dimension for a clean per-tier conversion.
  trackOnce(`purchase:${reference}`, 'purchase', params)
  trackOnce(`sub:${reference}`, 'subscription_start', { tier, billing_cycle: billingCycle, value: params.value, currency: params.currency })
}

export function trackFirstDownload(userId, { itemId, category }) {
  trackOnce(`first-download:${userId}`, 'first_download', { item_id: String(itemId), item_category: category })
}

export function trackCreatorApplication(userId) {
  trackOnce(`creator-app:${userId}`, 'creator_application_submitted', {})
}

export function trackNewsletterSignup(source) {
  track('newsletter_signup', { source })
}
