import { sql } from '../db.js'
import { requireAdmin } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { mailerConfigured, sendBatch, fromAddress, explainMailError } from '../mailer.js'
import { deliver, unsubscribeLinks } from '../email/index.js'
import { newsletterEmail } from '../email/templates.js'
import { ensureEmailTables } from '../email/store.js'

/**
 * Sending the newsletter.
 *
 * GET                           audience size and past broadcasts
 * POST { op:'preview', … }      the rendered email, nothing sent
 * POST { op:'test', … }         one copy to the admin's own address
 * POST { op:'create', … }       start a broadcast (nothing goes out yet)
 * POST { op:'send-batch', id }  send the next batch; call until `done`
 *
 * A function here runs for at most ten seconds, so a big list can't go out in
 * one call. The page sends a batch at a time and keeps calling until the
 * broadcast says it is done. Every recipient is recorded before it is sent,
 * so closing the tab half way and coming back resumes where it stopped,
 * and can never mail anyone twice.
 */

const BATCH_SIZE = 50
const MAX_BODY = 20000

/*
 * The audience is confirmed subscribers who are not on the suppression list.
 * The condition is written out in each query below: the Neon driver runs one
 * tagged template as one statement and can't splice a query into another.
 */

function validate(body) {
  const subject = String(body?.subject || '').trim()
  const text = String(body?.body || '')
  const preheader = String(body?.preheader || '').trim().slice(0, 140)
  if (subject.length < 3 || subject.length > 150) return { error: 'Give it a subject between 3 and 150 characters.' }
  if (text.trim().length < 10) return { error: 'Write the message.' }
  if (text.length > MAX_BODY) return { error: `That is over ${MAX_BODY.toLocaleString()} characters.` }
  return { subject, body: text, preheader }
}

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST'])) return
    const admin = await requireAdmin(req, res, ['marketing'])
    if (!admin) return
    await run(req, res, admin)
  })
}

/** The handler proper, taking an already-verified admin. Exported so it can be tested. */
export async function run(req, res, admin) {
  await ensureEmailTables()

  if (req.method === 'GET') {
    const [counts] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'unsubscribed')::int AS unsubscribed
      FROM newsletter_subscribers
    `
    const [{ audience }] = await sql`
      SELECT COUNT(*)::int AS audience FROM newsletter_subscribers s
      WHERE s.status = 'confirmed' AND NOT EXISTS (SELECT 1 FROM email_suppressions x WHERE x.email = lower(s.email))
    `
    const history = await sql`
      SELECT id, subject, status, total, sent, failed, created_at, finished_at
      FROM newsletter_broadcasts ORDER BY created_at DESC LIMIT 15
    `
    return send(res, 200, {
      configured: mailerConfigured(),
      from: fromAddress('newsletter'),
      counts: { ...counts, audience },
      history: history.map((h) => ({
        id: h.id,
        subject: h.subject,
        status: h.status,
        total: h.total,
        sent: h.sent,
        failed: h.failed,
        createdAt: h.created_at,
        finishedAt: h.finished_at,
      })),
    })
  }

  const op = req.body?.op

  /* -------------------------------------------------------- preview */
  if (op === 'preview' || op === 'test') {
    const v = validate(req.body)
    if (v.error) return send(res, 400, { error: v.error })
    const links = unsubscribeLinks('preview-token')
    const { html, text } = newsletterEmail({ subject: v.subject, preheader: v.preheader, body: v.body, unsubscribeUrl: links.url })
    if (op === 'preview') return send(res, 200, { html, text })

    const result = await deliver({
      to: admin.email,
      subject: `[Test] ${v.subject}`,
      html,
      text,
      category: 'transactional',
      template: 'newsletter_test',
      userId: admin.id,
      from: fromAddress('newsletter'),
    })
    return send(res, 200, { ok: result.ok, to: admin.email, error: result.ok ? null : result.error })
  }

  /* --------------------------------------------------------- create */
  if (op === 'create') {
    if (!mailerConfigured()) return send(res, 503, { error: 'Email is not configured on the server yet.' })
    const v = validate(req.body)
    if (v.error) return send(res, 400, { error: v.error })

    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM newsletter_subscribers s
      WHERE s.status = 'confirmed' AND NOT EXISTS (SELECT 1 FROM email_suppressions x WHERE x.email = lower(s.email))
    `
    if (n === 0) return send(res, 409, { error: 'There are no confirmed subscribers to send to yet.' })

    const [row] = await sql`
      INSERT INTO newsletter_broadcasts (subject, preheader, body, total, created_by)
      VALUES (${v.subject}, ${v.preheader || null}, ${v.body}, ${n}, ${admin.id})
      RETURNING id
    `
    return send(res, 201, { id: row.id, total: n })
  }

  /* ----------------------------------------------------- send-batch */
  if (op === 'send-batch') {
    const id = req.body?.id
    const [broadcast] = await sql`SELECT * FROM newsletter_broadcasts WHERE id = ${id}`
    if (!broadcast) return send(res, 404, { error: 'Broadcast not found' })
    if (broadcast.status === 'sent') return send(res, 200, { done: true, sent: broadcast.sent, failed: broadcast.failed, remaining: 0 })

    // Claim the next people. Recording them first is what makes a retry, a
    // second tab or a timeout half way unable to send anyone a second copy.
    const claimed = await sql`
      INSERT INTO newsletter_deliveries (broadcast_id, email)
      SELECT ${id}, s.email FROM newsletter_subscribers s
      WHERE s.status = 'confirmed'
        AND NOT EXISTS (SELECT 1 FROM email_suppressions x WHERE x.email = lower(s.email))
        AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.broadcast_id = ${id} AND d.email = s.email)
      LIMIT ${BATCH_SIZE}
      ON CONFLICT DO NOTHING
      RETURNING email
    `

    if (claimed.length) {
      const tokens = await sql`
        SELECT email, unsubscribe_token FROM newsletter_subscribers WHERE email = ANY(${claimed.map((c) => c.email)})
      `
      const tokenFor = new Map(tokens.map((r) => [r.email, r.unsubscribe_token]))

      const messages = claimed.map(({ email }) => {
        const links = unsubscribeLinks(tokenFor.get(email))
        const { html, text } = newsletterEmail({
          subject: broadcast.subject,
          preheader: broadcast.preheader || '',
          body: broadcast.body,
          unsubscribeUrl: links.url,
        })
        return {
          to: email,
          subject: broadcast.subject,
          html,
          text,
          from: fromAddress('newsletter'),
          headers: links.headers,
          tags: [
            { name: 'category', value: 'marketing' },
            { name: 'broadcast', value: broadcast.id },
          ],
        }
      })

      let results
      try {
        results = await sendBatch(messages, { idempotencyKey: `broadcast-${id}-${claimed[0].email}` })
      } catch (err) {
        // The whole batch failed (a network error, a rate limit). Give the
        // claimed recipients back so the next call tries them again.
        await sql`DELETE FROM newsletter_deliveries WHERE broadcast_id = ${id} AND email = ANY(${claimed.map((c) => c.email)}) AND status = 'queued'`
        return send(res, 502, { error: explainMailError(err) })
      }

      for (let i = 0; i < claimed.length; i += 1) {
        const r = results[i] || {}
        await sql`
          UPDATE newsletter_deliveries
          SET status = ${r.error ? 'failed' : 'sent'}, provider_id = ${r.id || null}, error = ${r.error ? String(r.error).slice(0, 300) : null}
          WHERE broadcast_id = ${id} AND email = ${claimed[i].email}
        `
      }
    }

    const [tally] = await sql`
      SELECT COUNT(*) FILTER (WHERE status <> 'failed')::int AS sent, COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
      FROM newsletter_deliveries WHERE broadcast_id = ${id}
    `
    const [{ remaining }] = await sql`
      SELECT COUNT(*)::int AS remaining FROM newsletter_subscribers s
      WHERE s.status = 'confirmed'
        AND NOT EXISTS (SELECT 1 FROM email_suppressions x WHERE x.email = lower(s.email))
        AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.broadcast_id = ${id} AND d.email = s.email)
    `
    const done = remaining === 0
    await sql`
      UPDATE newsletter_broadcasts
      SET sent = ${tally.sent}, failed = ${tally.failed},
          status = ${done ? 'sent' : 'sending'}, finished_at = ${done ? new Date().toISOString() : null}
      WHERE id = ${id}
    `
    return send(res, 200, { done, sent: tally.sent, failed: tally.failed, remaining, total: broadcast.total })
  }

  return send(res, 400, { error: 'Unknown operation' })
}
