import { sql } from '../_lib/db.js'
import { requireAdmin } from '../_lib/auth.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'

function serialize(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    url: r.url,
    group: r.resource_group,
    isPublished: r.is_published,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }
}

/**
 * Admin-managed entries on the Resources page. These are merged in alongside
 * the built-in ones the client ships, so an admin can add a link without a
 * deploy.
 *
 * GET     every resource, published or not
 * POST    { title, url, description?, group?, sortOrder?, isPublished? }
 * PATCH   { id, ...same }
 * DELETE  ?id=
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return

    const admin = await requireAdmin(req, res)
    if (!admin) return

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM app_resources ORDER BY resource_group, sort_order, created_at`
      return send(res, 200, { resources: rows.map(serialize) })
    }

    if (req.method === 'POST') {
      const { title, url, description, group, sortOrder, isPublished } = req.body || {}
      if (!title?.trim() || !url?.trim()) {
        return send(res, 400, { error: 'title and url are required' })
      }
      const rows = await sql`
        INSERT INTO app_resources (title, description, url, resource_group, sort_order, is_published, created_by)
        VALUES (
          ${title.trim()}, ${description?.trim() || null}, ${url.trim()},
          ${group?.trim() || 'Getting started'}, ${Number(sortOrder) || 0},
          ${isPublished === undefined ? true : !!isPublished}, ${admin.id}
        )
        RETURNING *
      `
      return send(res, 201, { resource: serialize(rows[0]) })
    }

    if (req.method === 'PATCH') {
      const { id, title, url, description, group, sortOrder, isPublished } = req.body || {}
      if (!id) return send(res, 400, { error: 'id is required' })

      const rows = await sql`
        UPDATE app_resources SET
          title = COALESCE(${title?.trim() ?? null}, title),
          url = COALESCE(${url?.trim() ?? null}, url),
          description = CASE WHEN ${description === undefined} THEN description ELSE ${description?.trim() || null} END,
          resource_group = COALESCE(${group?.trim() ?? null}, resource_group),
          sort_order = COALESCE(${sortOrder === undefined ? null : Number(sortOrder)}, sort_order),
          is_published = COALESCE(${isPublished ?? null}, is_published),
          updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return send(res, 404, { error: 'resource not found' })
      return send(res, 200, { resource: serialize(rows[0]) })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      await sql`DELETE FROM app_resources WHERE id = ${id}`
      return send(res, 200, { ok: true })
    }
  })
}
