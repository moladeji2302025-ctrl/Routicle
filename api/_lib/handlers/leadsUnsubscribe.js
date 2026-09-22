import { sql } from '../db.js'
import { send, withErrorHandling } from '../http.js'

function appBase(req) {
  return (process.env.APP_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`).replace(/\/$/, '')
}

function redirect(res, location) {
  res.statusCode = 303
  res.setHeader('Location', location)
  res.end()
}

/**
 * A lead's own unsubscribe link, separate from the newsletter's: this list is
 * sales prospects, not subscribers, and the two must never be conflated.
 *
 * GET  ?token=    the link in the email
 * POST ?token=    Gmail/Apple's own one-click Unsubscribe button (RFC 8058)
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    const token = String(req.query?.token || '').trim()
    if (!token) return send(res, 400, { error: 'Nothing to do.' })

    await sql`UPDATE leads SET unsubscribed_at = now(), updated_at = now() WHERE unsubscribe_token = ${token} AND unsubscribed_at IS NULL`

    if (req.method === 'POST') return send(res, 200, { ok: true })
    if (req.method === 'GET') return redirect(res, `${appBase(req)}/?unsubscribed=1`)
    return send(res, 405, { error: 'Method not allowed' })
  })
}
