import { sql } from '../db.js'
import { requireAdmin, logAdmin } from '../auth.js'
import { deliver } from '../email/index.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

const STATUSES = ['open', 'pending', 'closed']

function serializeTicket(r) {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    subject: r.subject,
    category: r.category,
    status: r.status,
    assignee: r.assignee_email,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * The customer care inbox. Every message from the Contact page lands here as
 * a ticket; a reply is sent by email and logged alongside it. Support and
 * full admins only.
 *
 * GET  ?status=&q=       tickets, newest first
 * GET  ?id=               one ticket with its full thread
 * POST { ticketId, body } reply, sent by email and appended to the thread
 * PATCH { id, status?, assignee? }
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'PATCH'])) return
    const admin = await requireAdmin(req, res, ['support'])
    if (!admin) return

    if (req.method === 'GET') {
      const { id } = req.query || {}
      if (id) {
        const ticket = (await sql`SELECT * FROM support_tickets WHERE id = ${id}`)[0]
        if (!ticket) return send(res, 404, { error: 'That ticket no longer exists' })
        const messages = await sql`
          SELECT id, direction, body, author_email, created_at FROM support_messages
          WHERE ticket_id = ${id} ORDER BY created_at ASC
        `
        return send(res, 200, {
          ticket: serializeTicket(ticket),
          messages: messages.map((m) => ({ id: m.id, direction: m.direction, body: m.body, author: m.author_email, at: m.created_at })),
        })
      }

      const status = STATUSES.includes(req.query?.status) ? req.query.status : null
      const q = (req.query?.q || '').trim().toLowerCase()
      const like = `%${q}%`
      const rows = status
        ? q
          ? await sql`SELECT * FROM support_tickets WHERE status = ${status} AND (lower(email) LIKE ${like} OR lower(subject) LIKE ${like}) ORDER BY created_at DESC LIMIT 200`
          : await sql`SELECT * FROM support_tickets WHERE status = ${status} ORDER BY created_at DESC LIMIT 200`
        : q
          ? await sql`SELECT * FROM support_tickets WHERE lower(email) LIKE ${like} OR lower(subject) LIKE ${like} ORDER BY created_at DESC LIMIT 200`
          : await sql`SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 200`

      const counts = await sql`SELECT status, COUNT(*)::int AS n FROM support_tickets GROUP BY status`
      return send(res, 200, {
        tickets: rows.map(serializeTicket),
        counts: Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c.status === s)?.n || 0])),
      })
    }

    if (req.method === 'POST') {
      const { ticketId, body } = req.body || {}
      const text = String(body || '').trim().slice(0, 5000)
      if (!ticketId || text.length < 2) return send(res, 400, { error: 'ticketId and a reply are required' })

      const ticket = (await sql`SELECT * FROM support_tickets WHERE id = ${ticketId}`)[0]
      if (!ticket) return send(res, 404, { error: 'That ticket no longer exists' })

      const result = await deliver({
        to: ticket.email,
        subject: `Re: ${ticket.subject}`,
        category: 'transactional',
        template: 'contact-reply',
        replyTo: admin.email,
        text: `${text}\n\n— ${admin.name || 'The Routicle team'}`,
      })

      await sql`
        INSERT INTO support_messages (ticket_id, direction, body, author_email)
        VALUES (${ticketId}, 'out', ${text}, ${admin.email})
      `
      await sql`UPDATE support_tickets SET status = 'pending', updated_at = now() WHERE id = ${ticketId}`
      await logAdmin(admin, 'support.reply', ticket.email, { ticketId })
      return send(res, 201, { ok: true, mailed: result.ok !== false })
    }

    const { id, status, assignee } = req.body || {}
    if (!id) return send(res, 400, { error: 'id is required' })
    const current = (await sql`SELECT * FROM support_tickets WHERE id = ${id}`)[0]
    if (!current) return send(res, 404, { error: 'That ticket no longer exists' })

    const nextStatus = STATUSES.includes(status) ? status : current.status
    const nextAssignee = assignee !== undefined ? String(assignee || '').trim().slice(0, 160) || null : current.assignee_email

    const rows = await sql`
      UPDATE support_tickets SET status = ${nextStatus}, assignee_email = ${nextAssignee}, updated_at = now()
      WHERE id = ${id} RETURNING *
    `
    if (nextStatus !== current.status) await logAdmin(admin, `support.${nextStatus}`, current.email, { ticketId: id })
    send(res, 200, { ticket: serializeTicket(rows[0]) })
  })
}
