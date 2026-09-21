import crypto from 'node:crypto'
import { sql } from '../_lib/db.js'
import { send, withErrorHandling } from '../_lib/http.js'
import { ensureEmailTables, suppress, updateByProviderId } from '../_lib/email/store.js'

// Signature verification needs the exact bytes Resend signed, so the framework
// must not parse (and re-serialize) the body first.
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

// Resend signs webhooks with Svix. A signature older than this is a replay.
const TOLERANCE_SECONDS = 5 * 60

/**
 * Verifies a Svix signature: HMAC-SHA256 over `${id}.${timestamp}.${body}`,
 * keyed with the base64 part of the `whsec_…` secret, and sent as one or more
 * space-separated `v1,<base64>` values (more than one while a secret rotates).
 */
export function verifySignature(raw, headers, secret) {
  const id = headers['svix-id']
  const timestamp = headers['svix-timestamp']
  const header = headers['svix-signature']
  if (!secret || !id || !timestamp || !header) return false

  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest()

  return String(header)
    .split(' ')
    .some((part) => {
      const [version, sig] = part.split(',')
      if (version !== 'v1' || !sig) return false
      const given = Buffer.from(sig, 'base64')
      return given.length === expected.length && crypto.timingSafeEqual(given, expected)
    })
}

/**
 * What happened to a message after Resend accepted it.
 *
 * Point a webhook at /api/email/webhook in the Resend dashboard, subscribe it to
 * the email.* events, and put its signing secret in RESEND_WEBHOOK_SECRET.
 *
 * A permanent bounce or a spam complaint puts the address on the suppression
 * list. Mailing an address that bounces, or someone who reported you as spam,
 * is the fastest way to damage the sending domain's reputation, and once that
 * is damaged every email lands in spam, not just the newsletter.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

    const secret = (process.env.RESEND_WEBHOOK_SECRET || '').trim()
    if (!secret) return send(res, 503, { error: 'Webhook secret is not configured' })

    const raw = await readRawBody(req)
    if (!verifySignature(raw, req.headers, secret)) return send(res, 401, { error: 'Invalid signature' })

    let event
    try {
      event = JSON.parse(raw)
    } catch {
      return send(res, 400, { error: 'Invalid body' })
    }

    await ensureEmailTables()
    const data = event.data || {}
    const providerId = data.email_id
    const recipients = Array.isArray(data.to) ? data.to : data.to ? [data.to] : []

    switch (event.type) {
      case 'email.delivered':
        await updateByProviderId(providerId, 'delivered')
        await sql`UPDATE newsletter_deliveries SET status = 'delivered' WHERE provider_id = ${providerId} AND status IN ('sent','queued')`
        break

      case 'email.delivery_delayed':
        await updateByProviderId(providerId, 'delayed')
        break

      case 'email.failed':
        await updateByProviderId(providerId, 'failed', data.reason || 'Resend could not send it')
        break

      case 'email.bounced': {
        const type = data.bounce?.type // 'Permanent' | 'Transient' | 'Undetermined'
        const message = data.bounce?.message || data.bounce?.subType || 'Bounced'
        await updateByProviderId(providerId, 'bounced', message)
        await sql`UPDATE newsletter_deliveries SET status = 'bounced', error = ${message} WHERE provider_id = ${providerId}`
        // A full mailbox or a blip clears up; an address that does not exist
        // never will, so only a permanent bounce is suppressed.
        if (type === 'Permanent') {
          for (const address of recipients) await suppress(address, 'bounce', message)
        }
        break
      }

      case 'email.complained': {
        await updateByProviderId(providerId, 'complained', 'Marked as spam')
        for (const address of recipients) {
          await suppress(address, 'complaint', 'Marked a message as spam')
          // Treat a spam report as an unsubscribe as well.
          await sql`
            UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = now()
            WHERE lower(email) = ${String(address).toLowerCase()} AND status <> 'unsubscribed'
          `
        }
        break
      }

      default:
        break
    }

    // Always 200 on a verified event, or Resend keeps retrying it.
    send(res, 200, { received: true })
  })
}
