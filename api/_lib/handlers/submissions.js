import { sql } from '../db.js'
import { headObjectSize, publicPreviewUrl, SOURCE_BUCKET, PREVIEW_BUCKET } from '../s3.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { requireUser, requireAdmin } from '../auth.js'
import { requireCreator } from '../guard.js'

const STATUSES = ['pending', 'approved', 'rejected', 'changes-requested']

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (req.method === 'GET' && req.query.mine) {
      // A creator's own work, in every state. Scoped to the session's creator
      // record, so it can only ever return the caller's rows. Separate from the
      // moderation queue below, which is admin only: when creators read their
      // pending work from that queue, locking it down hid it from them too.
      const user = await requireUser(req, res)
      if (!user) return
      const creator = await requireCreator(res, user)
      if (!creator) return

      const rows = await sql`
        SELECT id, title, department, file_types, description, is_free, moderation_status,
               moderation_note, thumbnail_key, preview_video_key, appreciation_count,
               download_count, created_at, updated_at
        FROM content_items
        WHERE creator_id = ${creator.id}
        ORDER BY created_at DESC
        LIMIT 500
      `
      return send(res, 200, {
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          // The column is still `department`; the wire format says category.
          category: r.department,
          fileTypes: r.file_types || [],
          description: r.description || '',
          free: r.is_free,
          status: r.moderation_status,
          note: r.moderation_note || '',
          image: r.thumbnail_key ? publicPreviewUrl(r.thumbnail_key) : null,
          hasVideo: Boolean(r.preview_video_key),
          appreciations: r.appreciation_count,
          downloads: r.download_count,
          submittedAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      })
    }

    if (req.method === 'GET') {
      // The moderation queue, including creator email addresses. Admin only.
      const admin = await requireAdmin(req, res)
      if (!admin) return

      const status = req.query.status || 'pending'
      if (!STATUSES.includes(status)) return send(res, 400, { error: 'Unknown status' })
      const rows = await sql`
        SELECT ci.*, c.name AS creator_name, c.email AS creator_email
        FROM content_items ci
        JOIN creators c ON c.id = ci.creator_id
        WHERE ci.moderation_status = ${status}
        ORDER BY ci.created_at DESC
      `
      return send(res, 200, rows)
    }

    if (!methodGuard(req, res, ['POST'])) return

    const user = await requireUser(req, res)
    if (!user) return

    const {
      title,
      category,
      subCategory,
      fileTypes,
      description,
      behindTheDesign,
      isAiGenerated,
      thumbnailKey,
      previewVideoKey,
      sourceObjectKeys,
    } = req.body || {}

    if (!title || !category || !thumbnailKey) {
      return send(res, 400, { error: 'title, category, and thumbnailKey are required' })
    }

    // Attributed to the session's own creator record, so a submission cannot be
    // filed under someone else's name.
    const creator = await requireCreator(res, user)
    if (!creator) return
    const creatorId = creator.id

    // Measure what actually landed in the bucket rather than trusting the
    // browser's claim: the presigned URL enforces the declared size, but the
    // number recorded here is what storage is really being billed for.
    const sources = Array.isArray(sourceObjectKeys) ? sourceObjectKeys : []
    const sizes = await Promise.all([
      headObjectSize({ bucket: PREVIEW_BUCKET, key: thumbnailKey }),
      ...(previewVideoKey ? [headObjectSize({ bucket: PREVIEW_BUCKET, key: previewVideoKey })] : []),
      ...sources.map((f) => headObjectSize({ bucket: SOURCE_BUCKET, key: f.key })),
    ])
    const totalBytes = sizes.reduce((sum, n) => sum + n, 0)

    const rows = await sql`
      INSERT INTO content_items (
        creator_id, title, department, sub_department, file_types, description,
        behind_the_design, is_ai_generated, thumbnail_key, preview_video_key, source_object_keys,
        total_bytes
      ) VALUES (
        ${creatorId}, ${title}, ${category}, ${subCategory || null}, ${fileTypes || []}, ${description || null},
        ${behindTheDesign || null}, ${Boolean(isAiGenerated)}, ${thumbnailKey}, ${previewVideoKey || null}, ${JSON.stringify(sources)},
        ${totalBytes}
      )
      RETURNING *
    `

    // Running total per creator, so a quota check is one column read rather
    // than a scan of every item they have ever uploaded.
    await sql`UPDATE creators SET storage_bytes = storage_bytes + ${totalBytes} WHERE id = ${creatorId}`

    send(res, 201, rows[0])
  })
}
