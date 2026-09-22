import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { getSession } from '../auth.js'
import { toFeedShape } from '../contentShape.js'

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return

    // Reading is public, but knowing who's asking is what marks a row as
    // liked by them — so the session is read, not required.
    const session = await getSession(req)
    const viewerId = session?.user?.id || null

    const category = req.query.category
    const rows = category
      ? await sql`
          SELECT ci.*, c.name AS creator_name, c.email AS creator_email, cu.id AS creator_user_id,
                 (ia.user_id IS NOT NULL) AS is_liked
          FROM content_items ci
          JOIN creators c ON c.id = ci.creator_id
          LEFT JOIN neon_auth."user" cu ON lower(cu.email) = lower(c.email)
          LEFT JOIN item_appreciations ia ON ia.content_item_id = ci.id AND ia.user_id = ${viewerId}
          WHERE ci.moderation_status = 'approved' AND ci.department = ${category}
          ORDER BY ci.created_at DESC
        `
      : await sql`
          SELECT ci.*, c.name AS creator_name, c.email AS creator_email, cu.id AS creator_user_id,
                 (ia.user_id IS NOT NULL) AS is_liked
          FROM content_items ci
          JOIN creators c ON c.id = ci.creator_id
          LEFT JOIN neon_auth."user" cu ON lower(cu.email) = lower(c.email)
          LEFT JOIN item_appreciations ia ON ia.content_item_id = ci.id AND ia.user_id = ${viewerId}
          WHERE ci.moderation_status = 'approved'
          ORDER BY ci.created_at DESC
        `
    send(res, 200, rows.map(toFeedShape))
  })
}
