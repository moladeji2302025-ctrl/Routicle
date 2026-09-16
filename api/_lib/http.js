/** Small helpers shared by every /api/* handler. Vercel's Node runtime already parses JSON bodies into req.body. */

export function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function methodGuard(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    send(res, 405, { error: `Method ${req.method} not allowed. Use ${allowed.join(', ')}.` })
    return false
  }
  return true
}

/**
 * Wraps a handler so a thrown error becomes a 500 instead of a hung request.
 *
 * The message is logged but never returned. Echoing `err.message` to the caller
 * leaks whatever the failure happened to mention — table and column names from
 * a Postgres error, a bucket name from S3, a connection string fragment — and
 * differences between messages let a caller probe for what exists. The client
 * gets one fixed sentence; the detail stays in the server log.
 */
export async function withErrorHandling(res, fn) {
  try {
    await fn()
  } catch (err) {
    console.error(err)
    send(res, 500, { error: 'Something went wrong on our end.' })
  }
}

/**
 * Applies the response headers that are not set at the edge.
 *
 * `no-store` matters on API responses specifically: several of these return
 * one person's private data, and a shared cache that keyed only on the URL
 * could hand it to the next caller.
 */
export function secureJson(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
}
