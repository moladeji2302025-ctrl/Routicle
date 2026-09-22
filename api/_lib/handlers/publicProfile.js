import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { getSession } from '../auth.js'
import { toFeedShape } from '../contentShape.js'

/**
 * A public profile: any signed-in account, by their own user id — the same
 * id comments and team-membership rows already carry, so anything that shows
 * a name and an avatar can link straight here. When the account's email
 * matches a `creators` row it's shown as a creator, portfolio and all;
 * otherwise it's just the account's public name, image and join date.
 *
 * GET ?id=<neon_auth user id>
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return

    const id = (req.query?.id || '').trim()
    if (!id) return send(res, 400, { error: 'id is required' })

    const session = await getSession(req)
    const viewerId = session?.user?.id || null

    const rows = await sql`
      SELECT u.id, u.name, u.image, u."createdAt" AS created_at,
             cr.id AS creator_id, cr.bio, cr.specialty, cr.location, cr.social
      FROM neon_auth."user" u
      LEFT JOIN creators cr ON lower(cr.email) = lower(u.email)
      WHERE u.id = ${id}
      LIMIT 1
    `
    if (rows.length === 0) return send(res, 404, { error: 'not found' })
    const row = rows[0]

    const profile = {
      id: row.id,
      name: row.name,
      image: row.image,
      memberSince: row.created_at,
      isCreator: Boolean(row.creator_id),
      bio: row.bio || '',
      specialty: row.specialty || '',
      location: row.location || '',
      social: row.social || {},
      pieces: [],
    }

    if (row.creator_id) {
      const pieces = await sql`
        SELECT ci.*, cr.name AS creator_name, cr.email AS creator_email, u.id AS creator_user_id,
               (ia.user_id IS NOT NULL) AS is_liked
        FROM content_items ci
        JOIN creators cr ON cr.id = ci.creator_id
        LEFT JOIN neon_auth."user" u ON lower(u.email) = lower(cr.email)
        LEFT JOIN item_appreciations ia ON ia.content_item_id = ci.id AND ia.user_id = ${viewerId}
        WHERE ci.creator_id = ${row.creator_id} AND ci.moderation_status = 'approved'
        ORDER BY ci.created_at DESC
      `
      profile.pieces = pieces.map(toFeedShape)
    }

    send(res, 200, profile)
  })
}
