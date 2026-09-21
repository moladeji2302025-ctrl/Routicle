import { sql } from '../db.js'
import { requireAdmin } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { notifyModeration } from '../email/index.js'

/**
 * Library management: everything in the catalogue regardless of moderation
 * state, with the controls to change it.
 *
 * GET     ?status=&q=   list
 * PATCH   { id, isFree?, isFeatured?, moderationStatus?, moderationNote? }
 * DELETE  ?id=          remove a piece outright
 *
 * isFeatured puts a template in front of subscribers in the Creative Suite.
 * Only templates can be featured, and only live ones are ever shown.
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
               c.is_template, c.template_kind, c.is_featured, c.template_slots,
               cr.name AS creator_name,
               (SELECT COUNT(*)::int FROM downloads d WHERE d.content_item_id = c.id AND d.source = 'template') AS template_uses
        FROM content_items c
        JOIN creators cr ON cr.id = c.creator_id
        WHERE (${status || null}::text IS NULL OR c.moderation_status = ${status || null})
          AND (${req.query?.templates === '1'} = false OR c.is_template)
          AND (${q || null}::text IS NULL OR lower(c.title) LIKE ${like} OR lower(cr.name) LIKE ${like})
        ORDER BY c.created_at DESC
        LIMIT 200
      `

      return send(res, 200, {
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          category: r.department,
          fileTypes: r.file_types || [],
          isFree: r.is_free,
          moderationStatus: r.moderation_status,
          thumbnailKey: r.thumbnail_key,
          appreciations: r.appreciation_count,
          downloads: r.download_count,
          isTemplate: r.is_template,
          templateKind: r.template_kind,
          isFeatured: r.is_featured,
          templatePages: r.template_slots?.summary?.pages || 0,
          templateUses: r.template_uses,
          creatorName: r.creator_name,
          createdAt: r.created_at,
        })),
      })
    }

    if (req.method === 'PATCH') {
      const { id, isFree, isFeatured, moderationStatus, moderationNote } = req.body || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      if (isFeatured !== undefined) {
        const [row] = await sql`SELECT is_template FROM content_items WHERE id = ${id}`
        if (!row) return send(res, 404, { error: 'item not found' })
        if (isFeatured && !row.is_template) return send(res, 400, { error: 'Only templates can be featured.' })
      }
      if (moderationStatus && !['pending', 'approved', 'rejected'].includes(moderationStatus)) {
        return send(res, 400, { error: 'moderationStatus must be pending, approved or rejected' })
      }

      const before = moderationStatus ? await sql`SELECT moderation_status FROM content_items WHERE id = ${id}` : []
      const rows = await sql`
        UPDATE content_items SET
          is_free = COALESCE(${isFree ?? null}, is_free),
          is_featured = COALESCE(${isFeatured ?? null}, is_featured),
          featured_at = CASE WHEN ${isFeatured === true} THEN now() WHEN ${isFeatured === false} THEN NULL ELSE featured_at END,
          moderation_status = COALESCE(${moderationStatus ?? null}, moderation_status),
          moderation_note = CASE WHEN ${moderationNote === undefined} THEN moderation_note ELSE ${moderationNote?.trim() || null} END,
          moderated_at = CASE WHEN ${!!moderationStatus} THEN now() ELSE moderated_at END,
          updated_at = now()
        WHERE id = ${id}
        RETURNING id, title, creator_id, moderation_status, moderation_note, moderated_at
      `
      if (rows.length === 0) return send(res, 404, { error: 'item not found' })

      // Approving or rejecting from here is a decision the creator should hear
      // about, the same as from the queue. Unpublishing back to pending isn't.
      if (moderationStatus && before[0]?.moderation_status !== rows[0].moderation_status) {
        const [creator] = await sql`SELECT email FROM creators WHERE id = ${rows[0].creator_id}`
        await notifyModeration({
          itemId: rows[0].id,
          title: rows[0].title,
          status: rows[0].moderation_status,
          note: rows[0].moderation_note,
          creatorEmail: creator?.email,
          moderatedAt: rows[0].moderated_at,
        })
      }
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
