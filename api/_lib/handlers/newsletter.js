import crypto from 'node:crypto'
import { sql } from '../db.js'
import { send, withErrorHandling } from '../http.js'
import { limit } from '../ratelimit.js'
import { newsletterConfirmEmail, mailErrorFor } from '../mailer.js'
import { deliver } from '../email/index.js'

/**
 * Newsletter signup for visitors without an account.
 *
 * POST { email, source, website }   sign up; always the same answer
 * POST ?unsubscribe=<token>         one-click unsubscribe (RFC 8058), for mail clients
 * GET  ?confirm=<token>             double opt-in link from the email
 * GET  ?unsubscribe=<token>         one-click unsubscribe
 *
 * The POST reply never says whether an address was already on the list, so
 * the form can't be used to find out who is subscribed. `website` is a
 * honeypot field people never see; anything filled in there is a bot and gets
 * the normal reply with nothing stored.
 */

const CONFIRM_HOURS = 48
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const OK = { ok: true, message: 'Check your inbox for a link to confirm.' }

let ensured = false
async function ensureTable() {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      email text PRIMARY KEY,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
      source text,
      confirm_token_hash text,
      confirm_expires_at timestamptz,
      unsubscribe_token text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      confirmed_at timestamptz,
      unsubscribed_at timestamptz
    )
  `
  ensured = true
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
const newToken = () => crypto.randomBytes(32).toString('base64url')

function appBase(req) {
  return (process.env.APP_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`).replace(/\/$/, '')
}

function redirect(res, location) {
  res.statusCode = 303
  res.setHeader('Location', location)
  res.end()
}

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    await ensureTable()
    const base = appBase(req)

    if (req.method === 'GET') {
      const { confirm, unsubscribe } = req.query || {}

      if (typeof confirm === 'string' && confirm) {
        const rows = await sql`
          UPDATE newsletter_subscribers
          SET status = 'confirmed', confirmed_at = now(), confirm_token_hash = NULL, confirm_expires_at = NULL
          WHERE confirm_token_hash = ${sha256(confirm)} AND confirm_expires_at > now()
          RETURNING email
        `
        return redirect(res, `${base}/explore?newsletter=${rows.length ? 'confirmed' : 'expired'}`)
      }

      if (typeof unsubscribe === 'string' && unsubscribe) {
        await sql`
          UPDATE newsletter_subscribers
          SET status = 'unsubscribed', unsubscribed_at = now(), confirm_token_hash = NULL
          WHERE unsubscribe_token = ${unsubscribe}
        `
        return redirect(res, `${base}/explore?newsletter=unsubscribed`)
      }

      return send(res, 400, { error: 'Nothing to do.' })
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

    // Gmail's and Apple's own "Unsubscribe" buttons POST to the URL in the
    // List-Unsubscribe header and expect a bare 200, not a redirect.
    if (typeof req.query?.unsubscribe === 'string' && req.query.unsubscribe) {
      await sql`
        UPDATE newsletter_subscribers
        SET status = 'unsubscribed', unsubscribed_at = now(), confirm_token_hash = NULL
        WHERE unsubscribe_token = ${req.query.unsubscribe}
      `
      return send(res, 200, { ok: true })
    }

    if (!(await limit(req, res, { name: 'newsletter-ip', limit: 5, windowSeconds: 3600 }))) return

    const { email: raw, source, website } = req.body || {}
    if (website) return send(res, 200, OK)

    const email = String(raw || '').trim().toLowerCase()
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return send(res, 400, { error: 'Enter a valid email address.' })
    }
    // Stops one address being mailed over and over from many IPs.
    if (!(await limit(req, res, { name: 'newsletter-email', key: email, limit: 3, windowSeconds: 86400 }))) return

    const existing = (await sql`SELECT status FROM newsletter_subscribers WHERE email = ${email}`)[0]
    if (existing?.status === 'confirmed') return send(res, 200, OK)

    const confirmToken = newToken()
    await sql`
      INSERT INTO newsletter_subscribers (email, status, source, confirm_token_hash, confirm_expires_at, unsubscribe_token)
      VALUES (
        ${email}, 'pending', ${String(source || '').slice(0, 40) || null}, ${sha256(confirmToken)},
        now() + make_interval(hours => ${CONFIRM_HOURS}), ${newToken()}
      )
      ON CONFLICT (email) DO UPDATE SET
        status = 'pending',
        confirm_token_hash = EXCLUDED.confirm_token_hash,
        confirm_expires_at = EXCLUDED.confirm_expires_at,
        unsubscribed_at = NULL
    `

    const confirmUrl = `${base}/api/public/newsletter?confirm=${confirmToken}`
    const { text, html } = newsletterConfirmEmail({ confirmUrl })
    try {
      await deliver({
        to: email,
        subject: 'Confirm your Routicle updates',
        text,
        html,
        category: 'transactional',
        template: 'newsletter_confirm',
        // Not a dedupe key: signing up again after the link expired must send a new one.
        throwOnError: true,
      })
    } catch (err) {
      return send(res, 503, { error: mailErrorFor(err) })
    }
    send(res, 200, OK)
  })
}
