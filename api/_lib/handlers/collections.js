import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { requireUser } from '../auth.js'
import { requireMembership } from '../guard.js'

/**
 * Server-side saved items (Collections) — personal, or shared when an
 * organizationId is given.
 *
 * The owner is always the session user. A `userId` in the request is ignored
 * entirely: when it was trusted, passing someone else's id read, added to and
 * deleted from their private collection.
 *
 * GET    ?organizationId=   list saved items for that context
 * POST   { organizationId?, contentItemId }   save one
 * DELETE ?organizationId=&contentItemId=      un-save one
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return

    const user = await requireUser(req, res)
    if (!user) return
    const userId = user.id

    if (req.method === 'GET') {
      const { organizationId } = req.query || {}
      if (organizationId && !(await requireMembership(res, userId, organizationId))) return

      const rows = organizationId
        ? await sql`SELECT content_item_id, saved_by_user_id, created_at FROM saved_items WHERE organization_id = ${organizationId} ORDER BY created_at DESC`
        : await sql`SELECT content_item_id, saved_by_user_id, created_at FROM saved_items WHERE user_id = ${userId} AND organization_id IS NULL ORDER BY created_at DESC`

      return send(res, 200, {
        items: rows.map((r) => ({ contentItemId: r.content_item_id, savedBy: r.saved_by_user_id, createdAt: r.created_at })),
      })
    }

    if (req.method === 'POST') {
      const { organizationId, contentItemId } = req.body || {}
      if (!contentItemId) return send(res, 400, { error: 'contentItemId is required' })
      if (organizationId && !(await requireMembership(res, userId, organizationId))) return

      if (organizationId) {
        await sql`
          INSERT INTO saved_items (user_id, organization_id, content_item_id, saved_by_user_id)
          VALUES (${userId}, ${organizationId}, ${contentItemId}, ${userId})
          ON CONFLICT (organization_id, content_item_id) WHERE organization_id IS NOT NULL DO NOTHING
        `
      } else {
        await sql`
          INSERT INTO saved_items (user_id, organization_id, content_item_id, saved_by_user_id)
          VALUES (${userId}, NULL, ${contentItemId}, ${userId})
          ON CONFLICT (user_id, content_item_id) WHERE organization_id IS NULL DO NOTHING
        `
      }
      return send(res, 201, { ok: true })
    }

    if (req.method === 'DELETE') {
      const { organizationId, contentItemId } = req.query || {}
      if (!contentItemId) return send(res, 400, { error: 'contentItemId is required' })
      if (organizationId && !(await requireMembership(res, userId, organizationId))) return

      if (organizationId) {
        await sql`DELETE FROM saved_items WHERE organization_id = ${organizationId} AND content_item_id = ${contentItemId}`
      } else {
        await sql`DELETE FROM saved_items WHERE user_id = ${userId} AND content_item_id = ${contentItemId} AND organization_id IS NULL`
      }
      return send(res, 200, { ok: true })
    }
  })
}
