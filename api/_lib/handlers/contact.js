import { sql } from '../db.js'
import { getSession } from '../auth.js'
import { deliver } from '../email/index.js'
import { limit, LIMITS, clientIp } from '../ratelimit.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

const CATEGORIES = ['general', 'complaint', 'billing', 'creator', 'press']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The Contact page's real form. Unauthenticated (a subscriber doesn't have to
 * be signed in to complain), so it leans on rate limiting, a honeypot field
 * and length caps rather than a session for abuse protection.
 *
 * POST { name, email, subject, message, category?, company? }
 * `company` is a honeypot: a real visitor never sees or fills it.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    // Two layers: per-IP (unauthenticated, so this is all there is to key on
    // pre-signup) and loose enough that a real person filling the form twice
    // never hits it.
    if (!(await limit(req, res, { name: 'contact', key: clientIp(req), limit: 5, windowSeconds: 600 }))) return

    const { name, email, subject, message, category, company } = req.body || {}
    if (company) return send(res, 200, { ok: true }) // honeypot: pretend success, send nothing

    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanSubject = String(subject || '').trim().slice(0, 160)
    const cleanMessage = String(message || '').trim().slice(0, 5000)
    const cleanName = String(name || '').trim().slice(0, 120)
    const cat = CATEGORIES.includes(category) ? category : 'general'

    if (!EMAIL_RE.test(cleanEmail)) return send(res, 400, { error: 'A valid email address is required' })
    if (cleanSubject.length < 3) return send(res, 400, { error: 'A subject is required' })
    if (cleanMessage.length < 10) return send(res, 400, { error: 'Say a little more — at least 10 characters' })

    // If they're signed in, the ticket is linked to their account, which lets
    // support answer without asking who they are.
    const session = await getSession(req)

    const rows = await sql`
      INSERT INTO support_tickets (email, name, subject, category, user_id)
      VALUES (${cleanEmail}, ${cleanName || null}, ${cleanSubject}, ${cat}, ${session?.user?.id || null})
      RETURNING id
    `
    const ticketId = rows[0].id
    await sql`
      INSERT INTO support_messages (ticket_id, direction, body, author_email)
      VALUES (${ticketId}, 'in', ${cleanMessage}, ${cleanEmail})
    `

    // A courtesy receipt. Never blocks the ticket from being recorded even if
    // sending fails.
    await deliver({
      to: cleanEmail,
      subject: `We got your message: ${cleanSubject}`,
      category: 'transactional',
      template: 'contact-received',
      text: `Hi${cleanName ? ` ${cleanName}` : ''},\n\nThanks for writing in. Someone will get back to you at this address.\n\nWhat you sent:\n"${cleanMessage}"\n\n— Routicle`,
    })

    send(res, 201, { ok: true, ticketId })
  })
}
