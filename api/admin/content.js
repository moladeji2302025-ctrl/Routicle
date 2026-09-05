import { sql } from '../_lib/db.js'
import { requireAdmin } from '../_lib/auth.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'

/**
 * Library management: everything in the catalogue regardless of moderation
 * state, with the controls to change it.
 *
 * GET     ?status=&q=   list
 * PATCH   { id, isFree?, moderationStatus?, moderationNote? }
 * DELETE  ?id=          remove a piece outright
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'PATCH', 'DELETE'])) return

    const admin = await requireAdmin(req, res)
    if (!admin) return

    if (req.method === 'GET') {
      const status = req.query?.status
      const q = (req.query?.q || '').trim().toLowerCase()
      const like = `%${q}%`

      const rows = await sql`
        SELECT c.id, c.title, c.department, c.file_types, c.is_free, c.moderation_status,
               c.thumbnail_key, c.appreciation_count, c.download_count, c.created_at,
               cr.name AS creator_name
        FROM content_items c
        JOIN creators cr ON cr.id = c.creator_id
        WHERE (${status || null}::text IS NULL OR c.moderation_status = ${status || null})
          AND (${q || null}::text IS NULL OR lower(c.title) LIKE ${like} OR lower(cr.name) LIKE ${like})
        ORDER BY c.created_at DESC
        LIMIT 200
      `

      return send(res, 200, {
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          department: r.department,
          fileTypes: r.file_types || [],
          isFree: r.is_free,
          moderationStatus: r.moderation_status,
          thumbnailKey: r.thumbnail_key,
          appreciations: r.appreciation_count,
          downloads: r.download_count,
          creatorName: r.creator_name,
          createdAt: r.created_at,
        })),
      })
    }

    if (req.method === 'PATCH') {
      const { id, isFree, moderationStatus, moderationNote } = req.body || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      if (moderationStatus && !['pending', 'approved', 'rejected'].includes(moderationStatus)) {
        return send(res, 400, { error: 'moderationStatus must be pending, approved or rejected' })
      }

      const rows = await sql`
        UPDATE content_items SET
          is_free = COALESCE(${isFree ?? null}, is_free),
          moderation_status = COALESCE(${moderationStatus ?? null}, moderation_status),
          moderation_note = CASE WHEN ${moderationNote === undefined} THEN moderation_note ELSE ${moderationNote?.trim() || null} END,
          moderated_at = CASE WHEN ${!!moderationStatus} THEN now() ELSE moderated_at END,
          updated_at = now()
        WHERE id = ${id}
        RETURNING id
      `
      if (rows.length === 0) return send(res, 404, { error: 'item not found' })
      return send(res, 200, { ok: true })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      await sql`DELETE FROM content_items WHERE id = ${id}`
      return send(res, 200, { ok: true })
    }
  })
}
