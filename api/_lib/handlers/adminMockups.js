import { randomUUID } from 'node:crypto'
import { sql } from '../db.js'
import { requireAdmin, logAdmin } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { presignUpload, deleteObject, publicPreviewUrl, PREVIEW_BUCKET } from '../s3.js'

const ALLOWED_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const MAX_BYTES = 12 * 1024 * 1024

function serialize(r) {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    image: publicPreviewUrl(r.image_key),
    width: r.width,
    height: r.height,
    isPublished: r.is_published,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }
}

/**
 * Admin-curated background photos for Mockup Studio.
 *
 * GET                              every template, published or not
 * POST    ?op=presign  {fileName, contentType, size}   a URL to upload the photo to, direct to storage
 * POST     {title, category, imageKey, width, height, isPublished?, sortOrder?}   create the row, once the photo has landed
 * PATCH    {id, ...same}
 * DELETE   ?id=                    also removes the stored photo
 *
 * Platform-wide, so admin-only (no department role can add these) — unlike
 * app_resources this isn't scoped to marketing's remit.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return

    const admin = await requireAdmin(req, res, [])
    if (!admin) return

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM mockup_templates ORDER BY category, sort_order, created_at`
      return send(res, 200, { templates: rows.map(serialize) })
    }

    if (req.method === 'POST' && req.query?.op === 'presign') {
      const { fileName, contentType, size } = req.body || {}
      const ext = ALLOWED_TYPES[contentType]
      if (!ext) return send(res, 400, { error: 'Only JPEG, PNG or WebP photos are supported.' })
      const declared = Number(size) || 0
      if (!declared || declared > MAX_BYTES) {
        return send(res, 400, { error: `That photo is too large — templates are capped at ${Math.round(MAX_BYTES / 1024 / 1024)}MB.` })
      }
      const imageKey = `mockup-templates/${randomUUID()}${ext}`
      const uploadUrl = await presignUpload({ bucket: PREVIEW_BUCKET, key: imageKey, contentType, contentLength: declared })
      return send(res, 200, { uploadUrl, imageKey, fileName })
    }

    if (req.method === 'POST') {
      const { title, category, imageKey, width, height, isPublished, sortOrder } = req.body || {}
      if (!title?.trim() || !imageKey) return send(res, 400, { error: 'title and imageKey are required' })
      const rows = await sql`
        INSERT INTO mockup_templates (title, category, image_key, width, height, is_published, sort_order, created_by)
        VALUES (
          ${title.trim()}, ${category?.trim() || 'other'}, ${imageKey},
          ${width ? Number(width) : null}, ${height ? Number(height) : null},
          ${isPublished === undefined ? true : !!isPublished}, ${Number(sortOrder) || 0}, ${admin.id}
        )
        RETURNING *
      `
      await logAdmin(admin, 'mockup.create', rows[0].id, { title: rows[0].title, category: rows[0].category })
      return send(res, 201, { template: serialize(rows[0]) })
    }

    if (req.method === 'PATCH') {
      const { id, title, category, isPublished, sortOrder } = req.body || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      const rows = await sql`
        UPDATE mockup_templates SET
          title = COALESCE(${title?.trim() ?? null}, title),
          category = COALESCE(${category?.trim() ?? null}, category),
          is_published = COALESCE(${isPublished ?? null}, is_published),
          sort_order = COALESCE(${sortOrder === undefined ? null : Number(sortOrder)}, sort_order),
          updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return send(res, 404, { error: 'template not found' })
      return send(res, 200, { template: serialize(rows[0]) })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      const rows = await sql`DELETE FROM mockup_templates WHERE id = ${id} RETURNING image_key`
      if (rows[0]) await deleteObject({ bucket: PREVIEW_BUCKET, key: rows[0].image_key })
      await logAdmin(admin, 'mockup.delete', id, null)
      return send(res, 200, { ok: true })
    }
  })
}
