import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { getSession, requireAdmin } from '../auth.js'
import { toFeedShape } from '../contentShape.js'

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    const { id } = req.query

    if (req.method === 'GET') {
      const session = await getSession(req)
      const viewerId = session?.user?.id || null

      const rows = await sql`
        SELECT ci.*, c.name AS creator_name, c.email AS creator_email, cu.id AS creator_user_id,
               (ia.user_id IS NOT NULL) AS is_liked
        FROM content_items ci
        JOIN creators c ON c.id = ci.creator_id
        LEFT JOIN neon_auth."user" cu ON lower(cu.email) = lower(c.email)
        LEFT JOIN item_appreciations ia ON ia.content_item_id = ci.id AND ia.user_id = ${viewerId}
        WHERE ci.id = ${id}
      `
      if (rows.length === 0) return send(res, 404, { error: 'not found' })
      return send(res, 200, toFeedShape(rows[0]))
    }

    if (req.method === 'PATCH') {
      // Flipping an item to free removes its paywall. Admin only — this was
      // open to anyone, so the whole library could be unlocked item by item.
      const admin = await requireAdmin(req, res, ['moderator'])
      if (!admin) return

      const { isFree } = req.body || {}
      const rows = await sql`
        UPDATE content_items SET is_free = ${Boolean(isFree)}, updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return send(res, 404, { error: 'not found' })
      return send(res, 200, { ok: true })
    }

    methodGuard(req, res, ['GET', 'PATCH'])
  })
}
