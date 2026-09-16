import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { requireUser } from '../auth.js'
import { requireMembership } from '../guard.js'

/**
 * Contents of one team folder.
 *
 * A folder id is not authority over the folder: the owning workspace is looked
 * up and membership of it required before anything is read or written.
 *
 * GET    ?folderId=                  ids in the folder, newest first
 * POST   { folderId, contentItemIds[] }   add one or many
 * DELETE ?folderId=&contentItemId=   remove one
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return

    const user = await requireUser(req, res)
    if (!user) return

    const folderId = req.method === 'POST' ? req.body?.folderId : req.query?.folderId
    if (!folderId) return send(res, 400, { error: 'folderId is required' })

    const owning = await sql`SELECT organization_id FROM team_folders WHERE id = ${folderId} LIMIT 1`
    if (owning.length === 0) return send(res, 404, { error: 'not found' })
    if (!(await requireMembership(res, user.id, owning[0].organization_id))) return

    if (req.method === 'GET') {
      const { folderId } = req.query || {}
      if (!folderId) return send(res, 400, { error: 'folderId is required' })

      const rows = await sql`
        SELECT content_item_id, added_by, added_at
        FROM team_folder_items
        WHERE folder_id = ${folderId}
        ORDER BY added_at DESC
      `
      return send(res, 200, {
        items: rows.map((r) => ({ contentItemId: r.content_item_id, addedBy: r.added_by, addedAt: r.added_at })),
      })
    }

    if (req.method === 'POST') {
      const { folderId, contentItemIds, addedBy } = req.body || {}
      const ids = (Array.isArray(contentItemIds) ? contentItemIds : [contentItemIds]).filter(Boolean).map(String)
      if (!folderId || ids.length === 0 || !addedBy) {
        return send(res, 400, { error: 'folderId, contentItemIds and addedBy are required' })
      }

      // UNNEST so a multi-select add is a single round trip; the unique index
      // makes re-adding something already in the folder a no-op.
      await sql`
        INSERT INTO team_folder_items (folder_id, content_item_id, added_by)
        SELECT ${folderId}, item_id, ${addedBy}
        FROM UNNEST(${ids}::text[]) AS item_id
        ON CONFLICT (folder_id, content_item_id) DO NOTHING
      `
      await sql`UPDATE team_folders SET updated_at = now() WHERE id = ${folderId}`
      return send(res, 201, { ok: true, added: ids.length })
    }

    if (req.method === 'DELETE') {
      const { folderId, contentItemId } = req.query || {}
      if (!folderId || !contentItemId) {
        return send(res, 400, { error: 'folderId and contentItemId are required' })
      }
      await sql`DELETE FROM team_folder_items WHERE folder_id = ${folderId} AND content_item_id = ${String(contentItemId)}`
      await sql`UPDATE team_folders SET updated_at = now() WHERE id = ${folderId}`
      return send(res, 200, { ok: true })
    }
  })
}
