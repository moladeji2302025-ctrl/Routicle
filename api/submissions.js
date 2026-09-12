import { sql } from './_lib/db.js'
import { headObjectSize, SOURCE_BUCKET, PREVIEW_BUCKET } from './_lib/s3.js'
import { send, methodGuard, withErrorHandling } from './_lib/http.js'

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (req.method === 'GET') {
      const status = req.query.status || 'pending'
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

    const {
      creatorEmail,
      title,
      department,
      subDepartment,
      fileTypes,
      description,
      behindTheDesign,
      isAiGenerated,
      thumbnailKey,
      previewVideoKey,
      sourceObjectKeys,
    } = req.body || {}

    if (!creatorEmail || !title || !department || !thumbnailKey) {
      return send(res, 400, { error: 'creatorEmail, title, department, and thumbnailKey are required' })
    }

    const creatorRows = await sql`SELECT id FROM creators WHERE email = ${creatorEmail.toLowerCase().trim()}`
    if (creatorRows.length === 0) return send(res, 404, { error: 'creator not found — apply as a creator first' })
    const creatorId = creatorRows[0].id

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
        ${creatorId}, ${title}, ${department}, ${subDepartment || null}, ${fileTypes || []}, ${description || null},
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
