import crypto from 'node:crypto'
import { sql } from '../db.js'
import { requireAdmin, logAdmin } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { sendBatch, fromAddress, explainMailError } from '../mailer.js'
import { deliver } from '../email/index.js'
import { renderEmail, markdownLite, appBase } from '../email/layout.js'
import { isSuppressed } from '../email/store.js'

const STATUSES = ['new', 'contacted', 'replied', 'won', 'lost']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const newToken = () => crypto.randomBytes(24).toString('base64url')

function serialize(r) {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    company: r.company,
    source: r.source,
    status: r.status,
    notes: r.notes,
    unsubscribed: Boolean(r.unsubscribed_at),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function unsubscribeLinks(token) {
  const url = `${appBase()}/api/public/leads-unsubscribe?token=${encodeURIComponent(token)}`
  return {
    url,
    headers: {
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

function outreachEmail({ subject, body, unsubscribeUrl }) {
  return renderEmail({
    heading: subject,
    blocks: markdownLite(body),
    unsubscribeUrl,
    reason: "You're getting this because a Routicle team member has you down as a prospect.",
  })
}

/**
 * A prospecting list, kept apart from account emails on purpose: nobody who
 * signed up for Routicle as a subscriber, creator or admin ends up mailed
 * here just because sales added them. Every message carries a working
 * unsubscribe link and the one-click header. Sales and full admins only.
 *
 * GET      ?status=&q=          leads, newest first, with counts
 * POST { op:'add', ... }        one lead
 * POST { op:'import', rows }    several at once (from a CSV), deduped
 * POST { op:'send', leadId, subject, body }
 * POST { op:'send-batch', leadIds, subject, body }
 * PATCH { id, status?, notes? }
 * DELETE ?id=
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return
    const admin = await requireAdmin(req, res, ['sales'])
    if (!admin) return

    if (req.method === 'GET') {
      const status = STATUSES.includes(req.query?.status) ? req.query.status : null
      const q = (req.query?.q || '').trim().toLowerCase()
      const like = `%${q}%`
      const rows = status
        ? q
          ? await sql`SELECT * FROM leads WHERE status = ${status} AND (lower(email) LIKE ${like} OR lower(COALESCE(name,'')) LIKE ${like} OR lower(COALESCE(company,'')) LIKE ${like}) ORDER BY created_at DESC LIMIT 500`
          : await sql`SELECT * FROM leads WHERE status = ${status} ORDER BY created_at DESC LIMIT 500`
        : q
          ? await sql`SELECT * FROM leads WHERE lower(email) LIKE ${like} OR lower(COALESCE(name,'')) LIKE ${like} OR lower(COALESCE(company,'')) LIKE ${like} ORDER BY created_at DESC LIMIT 500`
          : await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`
      const counts = await sql`SELECT status, COUNT(*)::int AS n FROM leads GROUP BY status`
      return send(res, 200, {
        leads: rows.map(serialize),
        counts: Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c.status === s)?.n || 0])),
      })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      const gone = await sql`DELETE FROM leads WHERE id = ${id} RETURNING email`
      if (gone[0]) await logAdmin(admin, 'leads.delete', gone[0].email)
      return send(res, 200, { ok: true })
    }

    if (req.method === 'PATCH') {
      const { id, status, notes } = req.body || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      const current = (await sql`SELECT * FROM leads WHERE id = ${id}`)[0]
      if (!current) return send(res, 404, { error: 'That lead no longer exists' })
      const nextStatus = STATUSES.includes(status) ? status : current.status
      const nextNotes = notes !== undefined ? String(notes).slice(0, 4000) : current.notes
      const rows = await sql`
        UPDATE leads SET status = ${nextStatus}, notes = ${nextNotes}, updated_at = now()
        WHERE id = ${id} RETURNING *
      `
      return send(res, 200, { lead: serialize(rows[0]) })
    }

    const op = req.body?.op

    if (op === 'add' || op === 'import') {
      const rows = op === 'import' ? req.body?.rows : [req.body]
      if (!Array.isArray(rows) || rows.length === 0) return send(res, 400, { error: 'Nothing to add' })

      let added = 0
      let skipped = 0
      for (const r of rows.slice(0, 2000)) {
        const email = String(r.email || '').trim().toLowerCase()
        if (!EMAIL_RE.test(email)) {
          skipped += 1
          continue
        }
        const result = await sql`
          INSERT INTO leads (email, name, company, source, unsubscribe_token, created_by)
          VALUES (${email}, ${String(r.name || '').trim().slice(0, 160) || null}, ${String(r.company || '').trim().slice(0, 160) || null}, ${String(r.source || '').trim().slice(0, 80) || null}, ${newToken()}, ${admin.id})
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `
        if (result[0]) added += 1
        else skipped += 1
      }
      await logAdmin(admin, 'leads.import', null, { added, skipped })
      return send(res, 201, { added, skipped })
    }

    if (op === 'send' || op === 'send-batch') {
      const subject = String(req.body?.subject || '').trim().slice(0, 160)
      const body = String(req.body?.body || '').trim().slice(0, 20000)
      if (subject.length < 3 || body.length < 10) return send(res, 400, { error: 'Write a subject and a message.' })

      const ids = op === 'send' ? [req.body?.leadId] : Array.isArray(req.body?.leadIds) ? req.body.leadIds.slice(0, 200) : []
      if (!ids.filter(Boolean).length) return send(res, 400, { error: 'No leads selected' })

      const rows = await sql`SELECT * FROM leads WHERE id = ANY(${ids}) AND unsubscribed_at IS NULL`
      const mailable = []
      for (const r of rows) {
        if (await isSuppressed(r.email)) continue
        mailable.push(r)
      }
      if (!mailable.length) return send(res, 409, { error: 'None of the selected leads can be mailed (unsubscribed or suppressed).' })

      const messages = mailable.map((lead) => {
        const links = unsubscribeLinks(lead.unsubscribe_token)
        const { html, text } = outreachEmail({ subject, body, unsubscribeUrl: links.url })
        return {
          to: lead.email,
          subject,
          html,
          text,
          from: fromAddress('newsletter'),
          headers: links.headers,
          tags: [{ name: 'category', value: 'sales-outreach' }],
        }
      })

      let results
      try {
        results = await sendBatch(messages, { idempotencyKey: `leads-${admin.id}-${Date.now()}` })
      } catch (err) {
        return send(res, 502, { error: explainMailError(err) })
      }

      let sent = 0
      for (let i = 0; i < mailable.length; i += 1) {
        const r = results[i] || {}
        if (r.error) continue
        sent += 1
        await sql`INSERT INTO lead_messages (lead_id, subject, body, sent_by) VALUES (${mailable[i].id}, ${subject}, ${body}, ${admin.id})`
        await sql`UPDATE leads SET status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END, updated_at = now() WHERE id = ${mailable[i].id}`
      }
      await logAdmin(admin, 'leads.outreach', null, { sent, attempted: mailable.length })
      return send(res, 200, { sent, attempted: mailable.length })
    }

    return send(res, 400, { error: `Unknown op: ${op}` })
  })
}
