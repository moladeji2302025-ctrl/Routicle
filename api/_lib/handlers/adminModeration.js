import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { requireAdmin } from '../auth.js'
import { notifyModeration } from '../email/index.js'

/**
 * Approve or reject a submission. Admin only — this decides what the whole
 * library shows, and it previously ran with no session check at all.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    const admin = await requireAdmin(req, res)
    if (!admin) return

    const { id, action, note } = req.body || {}
    if (!id || !['approve', 'reject'].includes(action)) {
      return send(res, 400, { error: 'id and action (approve|reject) are required' })
    }

    const status = action === 'approve' ? 'approved' : 'rejected'
    const before = await sql`SELECT moderation_status FROM content_items WHERE id = ${id}`
    const rows = await sql`
      UPDATE content_items
      SET moderation_status = ${status}, moderation_note = ${note || null}, moderated_at = now(), updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) return send(res, 404, { error: 'not found' })

    // Tell the creator, but only when the decision actually changed.
    if (before[0]?.moderation_status !== status) {
      const [creator] = await sql`SELECT email FROM creators WHERE id = ${rows[0].creator_id}`
      await notifyModeration({
        itemId: rows[0].id,
        title: rows[0].title,
        status,
        note: rows[0].moderation_note,
        creatorEmail: creator?.email,
        moderatedAt: rows[0].moderated_at,
      })
    }
    send(res, 200, rows[0])
  })
}
