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
    // No creator email and no storage keys in a public projection: the first is
    // harvestable, and the second names the paywalled objects directly. Only
    // the file labels go out, which fileTypes already implies.
    sourceFiles: (row.source_object_keys || []).map((f) => ({ label: f.label })),
    department: row.department,
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
    if (!methodGuard(req, res, ['GET'])) return

    const department = req.query.department
    const rows = department
      ? await sql`
          SELECT ci.*, c.name AS creator_name, c.email AS creator_email
          FROM content_items ci
          JOIN creators c ON c.id = ci.creator_id
          WHERE ci.moderation_status = 'approved' AND ci.department = ${department}
          ORDER BY ci.created_at DESC
        `
      : await sql`
          SELECT ci.*, c.name AS creator_name, c.email AS creator_email
          FROM content_items ci
          JOIN creators c ON c.id = ci.creator_id
          WHERE ci.moderation_status = 'approved'
          ORDER BY ci.created_at DESC
        `
    send(res, 200, rows.map(toFeedShape))
  })
}
