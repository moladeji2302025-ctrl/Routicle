import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { publicPreviewUrl } from '../s3.js'
import { requireAdmin } from '../auth.js'

function toFeedShape(row) {
  return {
    id: row.id,
    image: publicPreviewUrl(row.thumbnail_key),
    // A smaller WebP copy for display only, when the uploader's browser could
    // make one. The download is always the original source.
    imageWebp: row.thumbnail_webp_key ? publicPreviewUrl(row.thumbnail_webp_key) : null,
    avatar: '/images/a1.jpg',
    title: row.title,
    creator: row.creator_name,
    // No creator email and no storage keys in a public projection: the first is
    // harvestable, and the second names the paywalled objects directly. Only
    // the file labels go out, which fileTypes already implies.
    sourceFiles: (row.source_object_keys || []).map((f) => ({ label: f.label })),
    category: row.department,
    appreciations: row.appreciation_count,
    views: row.download_count,
    fileTypes: row.file_types || [],
    free: row.is_free,
    hasVideo: Boolean(row.preview_video_key),
    moderationStatus: row.moderation_status,
    behindTheDesign: row.behind_the_design || '',
    description: row.description || '',
    isLive: true,
  }
}

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    const { id } = req.query

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT ci.*, c.name AS creator_name, c.email AS creator_email
        FROM content_items ci
        JOIN creators c ON c.id = ci.creator_id
        WHERE ci.id = ${id}
      `
      if (rows.length === 0) return send(res, 404, { error: 'not found' })
      return send(res, 200, toFeedShape(rows[0]))
    }

    if (req.method === 'PATCH') {
      // Flipping an item to free removes its paywall. Admin only — this was
      // open to anyone, so the whole library could be unlocked item by item.
      const admin = await requireAdmin(req, res)
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
