import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

/**
 * Team folders — the shared, foldered view of a workspace's library.
 *
 * Trusts the caller-supplied organizationId/userId the same way collections.js
 * and downloads.js do; server-side session verification is still outstanding
 * for every endpoint in this app.
 *
 * GET    ?organizationId=            folders for a team, with item counts
 * POST   { organizationId, name, createdBy, isDefault? }   create one
 * PATCH  { id, name?, isStarred? }   rename / star
 * DELETE ?id=                        delete (its items cascade)
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return

    if (req.method === 'GET') {
      const { organizationId } = req.query || {}
      if (!organizationId) return send(res, 400, { error: 'organizationId is required' })

      const rows = await sql`
        SELECT f.id, f.name, f.is_starred, f.is_default, f.created_at, f.updated_at,
               COUNT(i.id)::int AS item_count,
               COALESCE(
                 ARRAY_AGG(i.content_item_id ORDER BY i.added_at DESC)
                   FILTER (WHERE i.content_item_id IS NOT NULL),
                 '{}'
               ) AS item_ids
        FROM team_folders f
        LEFT JOIN team_folder_items i ON i.folder_id = f.id
        WHERE f.organization_id = ${organizationId}
        GROUP BY f.id
        ORDER BY f.is_default DESC, f.is_starred DESC, f.updated_at DESC
      `

      return send(res, 200, {
        folders: rows.map((r) => ({
          id: r.id,
          name: r.name,
          isStarred: r.is_starred,
          isDefault: r.is_default,
          itemCount: r.item_count,
          // Only the newest few are ever rendered as folder-cover thumbnails.
          itemIds: (r.item_ids || []).slice(0, 4),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      })
    }

    if (req.method === 'POST') {
      const { organizationId, name, createdBy, isDefault } = req.body || {}
      if (!organizationId || !name?.trim() || !createdBy) {
        return send(res, 400, { error: 'organizationId, name and createdBy are required' })
      }

      // A team's automatic folder is created on every team-create; the partial
      // unique index makes a retry a no-op rather than a duplicate.
      const rows = isDefault
        ? await sql`
            INSERT INTO team_folders (organization_id, name, created_by, is_default)
            VALUES (${organizationId}, ${name.trim()}, ${createdBy}, true)
            ON CONFLICT (organization_id) WHERE is_default DO NOTHING
            RETURNING id, name, is_starred, is_default
          `
        : await sql`
            INSERT INTO team_folders (organization_id, name, created_by)
            VALUES (${organizationId}, ${name.trim()}, ${createdBy})
            RETURNING id, name, is_starred, is_default
          `

      if (rows.length === 0) return send(res, 200, { folder: null, alreadyExists: true })
      const f = rows[0]
      return send(res, 201, {
        folder: { id: f.id, name: f.name, isStarred: f.is_starred, isDefault: f.is_default, itemCount: 0, itemIds: [] },
      })
    }

    if (req.method === 'PATCH') {
      const { id, name, isStarred } = req.body || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      if (name === undefined && isStarred === undefined) {
        return send(res, 400, { error: 'nothing to update' })
      }

      const rows = await sql`
        UPDATE team_folders
        SET name = COALESCE(${name?.trim() ?? null}, name),
            is_starred = COALESCE(${isStarred ?? null}, is_starred),
            updated_at = now()
        WHERE id = ${id}
        RETURNING id, name, is_starred, is_default
      `
      if (rows.length === 0) return send(res, 404, { error: 'folder not found' })
      const f = rows[0]
      return send(res, 200, { folder: { id: f.id, name: f.name, isStarred: f.is_starred, isDefault: f.is_default } })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {}
      if (!id) return send(res, 400, { error: 'id is required' })

      // The automatic folder is the team's home for loose items — removing it
      // would leave the team page with nowhere to put anything.
      const rows = await sql`SELECT is_default FROM team_folders WHERE id = ${id}`
      if (rows.length === 0) return send(res, 404, { error: 'folder not found' })
      if (rows[0].is_default) return send(res, 400, { error: "a team's default folder can't be deleted" })

      await sql`DELETE FROM team_folders WHERE id = ${id}`
      return send(res, 200, { ok: true })
    }
  })
}
