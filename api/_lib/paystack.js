import crypto from 'crypto'

const API = 'https://api.paystack.co'

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set')
  return key
}

async function paystack(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.status === false) {
    throw new Error(body.message || `Paystack ${path} failed (${res.status})`)
  }
  return body.data
}

/**
 * Starts a checkout. Returns the hosted-checkout URL to send the buyer to.
 *
 * If a Paystack plan code is supplied, Paystack treats the charge as the first
 * cycle of a real recurring subscription and bills automatically from then on.
 * Without one it's a single charge and we track the period end ourselves — see
 * PAYSTACK_PLAN_* in the billing README notes.
 */
export function initializeTransaction({ email, amountMinor, reference, currency, callbackUrl, planCode, metadata }) {
  return paystack('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: amountMinor,
      reference,
      currency,
      callback_url: callbackUrl,
      ...(planCode ? { plan: planCode } : {}),
      metadata,
    }),
  })
}

export function verifyTransaction(reference) {
  return paystack(`/transaction/verify/${encodeURIComponent(reference)}`)
}

export function disableSubscription({ code, token }) {
  return paystack('/subscription/disable', {
    method: 'POST',
    body: JSON.stringify({ code, token }),
  })
}

export function fetchSubscription(code) {
  return paystack(`/subscription/${encodeURIComponent(code)}`)
}

/** Paystack signs webhooks as HMAC SHA512 of the raw request body. */
export function isValidWebhookSignature(rawBody, signature) {
  if (!signature) return false
  const expected = crypto.createHmac('sha512', secretKey()).update(rawBody).digest('hex')
  // Both are hex digests of identical length, so timingSafeEqual is safe here.
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
