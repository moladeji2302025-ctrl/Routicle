import { sql } from './_lib/db.js'
import { send, methodGuard, withErrorHandling } from './_lib/http.js'

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    const { id, action, note } = req.body || {}
    if (!id || !['approve', 'reject'].includes(action)) {
      return send(res, 400, { error: 'id and action (approve|reject) are required' })
    }

    const status = action === 'approve' ? 'approved' : 'rejected'
    const rows = await sql`
      UPDATE content_items
      SET moderation_status = ${status}, moderation_note = ${note || null}, moderated_at = now(), updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) return send(res, 404, { error: 'not found' })
    send(res, 200, rows[0])
  })
}
