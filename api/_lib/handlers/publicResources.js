import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

/**
 * Published admin-added resources, for the client's Resources page to merge in
 * alongside its built-in entries. Read-only and unauthenticated, same as
 * /api/updates.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return

    const rows = await sql`
      SELECT id, title, description, url, resource_group, sort_order
      FROM app_resources
      WHERE is_published
      ORDER BY resource_group, sort_order, created_at
    `

    send(res, 200, {
      resources: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        url: r.url,
        group: r.resource_group,
        sortOrder: r.sort_order,
      })),
    })
  })
}
