import { sql } from '../db.js'
import { requireAdmin } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

const CATEGORIES = ['feature', 'improvement', 'fix', 'announcement']

function serialize(r) {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    category: r.category,
    isPublished: r.is_published,
    isPinned: r.is_pinned,
    linkUrl: r.link_url,
    linkLabel: r.link_label,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * Admin-side changelog management. The public read lives in /api/updates and
 * only ever returns published rows; this one returns drafts too.
 *
 * GET     every update, newest first
 * POST    { title, body, category, isPublished?, isPinned?, linkUrl?, linkLabel? }
 * PATCH   { id, ...same fields }
 * DELETE  ?id=
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return

    const admin = await requireAdmin(req, res)
    if (!admin) return

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM app_updates
        ORDER BY is_pinned DESC, COALESCE(published_at, created_at) DESC
      `
      return send(res, 200, { updates: rows.map(serialize) })
    }

    if (req.method === 'POST') {
      const { title, body, category, isPublished, isPinned, linkUrl, linkLabel } = req.body || {}
      if (!title?.trim() || !body?.trim()) {
        return send(res, 400, { error: 'title and body are required' })
      }
      const cat = CATEGORIES.includes(category) ? category : 'announcement'

      const rows = await sql`
        INSERT INTO app_updates (title, body, category, is_published, is_pinned, link_url, link_label, created_by, published_at)
        VALUES (
          ${title.trim()}, ${body.trim()}, ${cat}, ${!!isPublished}, ${!!isPinned},
          ${linkUrl?.trim() || null}, ${linkLabel?.trim() || null}, ${admin.id},
          ${isPublished ? new Date().toISOString() : null}
        )
        RETURNING *
      `
      return send(res, 201, { update: serialize(rows[0]) })
    }

    if (req.method === 'PATCH') {
      const { id, title, body, category, isPublished, isPinned, linkUrl, linkLabel } = req.body || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      if (category !== undefined && !CATEGORIES.includes(category)) {
        return send(res, 400, { error: `category must be one of ${CATEGORIES.join(', ')}` })
      }

      const rows = await sql`
        UPDATE app_updates SET
          title = COALESCE(${title?.trim() ?? null}, title),
          body = COALESCE(${body?.trim() ?? null}, body),
          category = COALESCE(${category ?? null}, category),
          is_published = COALESCE(${isPublished ?? null}, is_published),
          is_pinned = COALESCE(${isPinned ?? null}, is_pinned),
          link_url = CASE WHEN ${linkUrl === undefined} THEN link_url ELSE ${linkUrl?.trim() || null} END,
          link_label = CASE WHEN ${linkLabel === undefined} THEN link_label ELSE ${linkLabel?.trim() || null} END,
          -- Stamp the publish date the first time it goes live, and keep that
          -- original date on every later edit rather than bumping it.
          published_at = CASE
            WHEN ${isPublished === true} AND published_at IS NULL THEN now()
            WHEN ${isPublished === false} THEN NULL
            ELSE published_at
          END,
          updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return send(res, 404, { error: 'update not found' })
      return send(res, 200, { update: serialize(rows[0]) })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      await sql`DELETE FROM app_updates WHERE id = ${id}`
      return send(res, 200, { ok: true })
    }
  })
}
