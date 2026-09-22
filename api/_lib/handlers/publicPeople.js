import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

/**
 * Name search across every account — creators and ordinary signed-up users
 * alike — for "find a person" rather than "find a piece of work"
 * (`/api/content` already covers that). Public-safe fields only: no email,
 * no plan, nothing `adminUsers.js`'s staff-only search returns.
 *
 * GET ?q=<name>
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return

    const q = (req.query?.q || '').trim()
    if (!q) return send(res, 200, { people: [] })

    const like = `%${q.toLowerCase()}%`
    const rows = await sql`
      SELECT u.id, u.name, u.image, (cr.id IS NOT NULL) AS is_creator
      FROM neon_auth."user" u
      LEFT JOIN creators cr ON lower(cr.email) = lower(u.email)
      WHERE lower(COALESCE(u.name, '')) LIKE ${like}
      ORDER BY is_creator DESC, u.name
      LIMIT 40
    `
    send(res, 200, {
      people: rows.map((r) => ({ id: r.id, name: r.name, image: r.image, isCreator: r.is_creator })),
    })
  })
}
