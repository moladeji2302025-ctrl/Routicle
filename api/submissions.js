import { sql } from './_lib/db.js'
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

    const rows = await sql`
      INSERT INTO content_items (
        creator_id, title, department, sub_department, file_types, description,
        behind_the_design, is_ai_generated, thumbnail_key, preview_video_key, source_object_keys
      ) VALUES (
        ${creatorId}, ${title}, ${department}, ${subDepartment || null}, ${fileTypes || []}, ${description || null},
        ${behindTheDesign || null}, ${Boolean(isAiGenerated)}, ${thumbnailKey}, ${previewVideoKey || null}, ${JSON.stringify(sourceObjectKeys || [])}
      )
      RETURNING *
    `
    send(res, 201, rows[0])
  })
}
