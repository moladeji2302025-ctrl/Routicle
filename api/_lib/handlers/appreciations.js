import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { requireUser } from '../auth.js'

/**
 * Likes ("appreciate") on a content item — one row per (user, item), real
 * Postgres rather than the client-only state this replaced, which is exactly
 * why a like used to vanish on refresh: nothing was ever written down.
 *
 * POST   { contentItemId }   like it
 * DELETE ?contentItemId=     un-like it
 *
 * The owner is always the session user, same as saved_items — a userId in
 * the request body would be trusted for nothing.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST', 'DELETE'])) return

    const user = await requireUser(req, res)
    if (!user) return

    if (req.method === 'POST') {
      const { contentItemId } = req.body || {}
      if (!contentItemId) return send(res, 400, { error: 'contentItemId is required' })

      const inserted = await sql`
        INSERT INTO item_appreciations (user_id, content_item_id)
        VALUES (${user.id}, ${contentItemId})
        ON CONFLICT (user_id, content_item_id) DO NOTHING
        RETURNING content_item_id
      `
      // Only bump the count on a genuinely new like — a double-click that
      // lands on the conflict path must not inflate it.
      if (inserted.length > 0) {
        await sql`UPDATE content_items SET appreciation_count = appreciation_count + 1 WHERE id = ${contentItemId}`
      }
      return send(res, 201, { ok: true })
    }

    const { contentItemId } = req.query || {}
    if (!contentItemId) return send(res, 400, { error: 'contentItemId is required' })

    const deleted = await sql`
      DELETE FROM item_appreciations WHERE user_id = ${user.id} AND content_item_id = ${contentItemId}
      RETURNING content_item_id
    `
    if (deleted.length > 0) {
      await sql`UPDATE content_items SET appreciation_count = GREATEST(appreciation_count - 1, 0) WHERE id = ${contentItemId}`
    }
    return send(res, 200, { ok: true })
  })
}
