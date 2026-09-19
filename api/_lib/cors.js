/**
 * Cross-origin policy for every /api entry point.
 *
 * Browsers attach an Origin header to cross-site requests. Without an explicit
 * policy the API answered them anyway: the browser would refuse to hand the
 * response to the calling page, but a "simple" request (a form-style POST) had
 * already run by then. This refuses any browser request from an origin that
 * isn't Routicle, before the handler does anything.
 *
 * Requests with no Origin header pass: that is a server-to-server call (the
 * Paystack webhook, a health check) or a same-origin navigation, neither of
 * which CORS has anything to say about.
 */

import { send } from './http.js'

function withScheme(host) {
  if (!host) return null
  return /^https?:\/\//.test(host) ? host.replace(/\/$/, '') : `https://${host}`
}

/**
 * The origins allowed to call the API. Explicit, never a wildcard.
 *
 * Vercel gives every deployment its own URL, and sets VERCEL_URL to that
 * deployment's host, so a preview build's frontend can reach its own API
 * without ever opening the door to other *.vercel.app sites. A pattern like
 * `routicle-*.vercel.app` would have: anyone can create a Vercel project whose
 * name starts with "routicle".
 */
function allowedOrigins() {
  const list = [
    'https://routicle.vercel.app',
    withScheme(process.env.APP_URL),
    withScheme(process.env.VERCEL_URL),
    withScheme(process.env.VERCEL_BRANCH_URL),
    withScheme(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    ...(process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((o) => withScheme(o.trim())),
  ]
  // Local development only. Never on a production deployment.
  if (process.env.VERCEL_ENV !== 'production') {
    list.push('http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000')
  }
  return new Set(list.filter(Boolean))
}

function isAllowed(origin, req) {
  if (allowedOrigins().has(origin)) return true
  // Same origin as the request itself, which covers a custom domain added
  // later without a code change. A browser can't forge Origin, so a page on
  // another site can never make this match.
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host
    return Boolean(host) && new URL(origin).host === host
  } catch {
    return false
  }
}

/**
 * Wraps an entry point. `methods` is what that endpoint actually serves, and
 * it is all a preflight will advertise.
 */
export function withCors(methods, handler) {
  const allowMethods = [...new Set([...methods, 'OPTIONS'])].join(', ')

  return async function corsHandler(req, res) {
    const origin = req.headers?.origin

    if (origin) {
      if (!isAllowed(origin, req)) {
        // No Access-Control-Allow-Origin header: the browser blocks the call,
        // and the handler never runs.
        return send(res, 403, { error: 'Cross-origin requests are not allowed.' })
      }
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      // The API authenticates with a bearer token, not cookies, so credentials
      // mode is never needed and is deliberately not allowed.
      res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
      res.setHeader('Access-Control-Allow-Methods', allowMethods)
      res.setHeader('Access-Control-Max-Age', '600')
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
    }

    return handler(req, res)
  }
}
