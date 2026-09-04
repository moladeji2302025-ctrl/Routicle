import { sql } from './_lib/db.js'
import { send, methodGuard, withErrorHandling } from './_lib/http.js'

/**
 * Real, server-side "saved items" (Collections) — personal (organizationId
 * omitted) or team-shared (organizationId set). Trusts the caller-supplied
 * userId/organizationId same as the rest of this prototype's mocked auth
 * (see downloads.js) rather than verifying the session server-side.
 *
 * GET    ?userId=&organizationId=   list saved items for that context
 * POST   { userId, organizationId?, contentItemId, savedByUserId }   save one
 * DELETE ?userId=&organizationId=&contentItemId=   un-save one
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return

    if (req.method === 'GET') {
      const { userId, organizationId } = req.query || {}
      if (!userId) return send(res, 400, { error: 'userId is required' })

      const rows = organizationId
        ? await sql`SELECT content_item_id, saved_by_user_id, created_at FROM saved_items WHERE organization_id = ${organizationId} ORDER BY created_at DESC`
        : await sql`SELECT content_item_id, saved_by_user_id, created_at FROM saved_items WHERE user_id = ${userId} AND organization_id IS NULL ORDER BY created_at DESC`

      return send(res, 200, {
        items: rows.map((r) => ({ contentItemId: r.content_item_id, savedBy: r.saved_by_user_id, createdAt: r.created_at })),
      })
    }

    if (req.method === 'POST') {
      const { userId, organizationId, contentItemId, savedByUserId } = req.body || {}
      if (!userId || !contentItemId) return send(res, 400, { error: 'userId and contentItemId are required' })

      if (organizationId) {
        await sql`
          INSERT INTO saved_items (user_id, organization_id, content_item_id, saved_by_user_id)
          VALUES (${userId}, ${organizationId}, ${contentItemId}, ${savedByUserId || userId})
          ON CONFLICT (organization_id, content_item_id) WHERE organization_id IS NOT NULL DO NOTHING
        `
      } else {
        await sql`
          INSERT INTO saved_items (user_id, organization_id, content_item_id, saved_by_user_id)
          VALUES (${userId}, NULL, ${contentItemId}, ${savedByUserId || userId})
          ON CONFLICT (user_id, content_item_id) WHERE organization_id IS NULL DO NOTHING
        `
      }
      return send(res, 201, { ok: true })
    }

    if (req.method === 'DELETE') {
      const { userId, organizationId, contentItemId } = req.query || {}
      if (!userId || !contentItemId) return send(res, 400, { error: 'userId and contentItemId are required' })

      if (organizationId) {
        await sql`DELETE FROM saved_items WHERE organization_id = ${organizationId} AND content_item_id = ${contentItemId}`
      } else {
        await sql`DELETE FROM saved_items WHERE user_id = ${userId} AND content_item_id = ${contentItemId} AND organization_id IS NULL`
      }
      return send(res, 200, { ok: true })
    }
  })
}
