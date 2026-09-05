import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { publicPreviewUrl } from '../s3.js'

function toFeedShape(row) {
  return {
    id: row.id,
    image: publicPreviewUrl(row.thumbnail_key),
    avatar: '/images/a1.jpg',
    title: row.title,
    creator: row.creator_name,
    creatorEmail: row.creator_email,
    department: row.department,
    appreciations: row.appreciation_count,
    views: row.download_count,
    fileTypes: row.file_types || [],
    free: row.is_free,
    hasVideo: Boolean(row.preview_video_key),
    moderationStatus: row.moderation_status,
    behindTheDesign: row.behind_the_design || '',
    description: row.description || '',
    sourceObjectKeys: row.source_object_keys || [],
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
