import { sql } from '../_lib/db.js'
import { requireAdmin } from '../_lib/auth.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'

/**
 * Every account, with whether they're a creator, an admin, and what they're
 * paying. Admin can be granted or revoked here.
 *
 * GET     ?q=   all users (optionally filtered by name/email)
 * POST    { userId }   grant admin
 * DELETE  ?userId=     revoke admin
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return

    const admin = await requireAdmin(req, res)
    if (!admin) return

    if (req.method === 'GET') {
      const q = (req.query?.q || '').trim().toLowerCase()
      const like = `%${q}%`

      const rows = q
        ? await sql`
            SELECT u.id, u.name, u.email, u.image, u.created_at,
                   (a.user_id IS NOT NULL) AS is_admin,
                   (cr.id IS NOT NULL) AS is_creator,
                   s.tier, s.status AS sub_status
            FROM neon_auth."user" u
            LEFT JOIN platform_admins a ON a.user_id = u.id
            LEFT JOIN creators cr ON lower(cr.email) = lower(u.email)
            LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
            WHERE lower(u.email) LIKE ${like} OR lower(COALESCE(u.name, '')) LIKE ${like}
            ORDER BY u.created_at DESC
            LIMIT 200
          `
        : await sql`
            SELECT u.id, u.name, u.email, u.image, u.created_at,
                   (a.user_id IS NOT NULL) AS is_admin,
                   (cr.id IS NOT NULL) AS is_creator,
                   s.tier, s.status AS sub_status
            FROM neon_auth."user" u
            LEFT JOIN platform_admins a ON a.user_id = u.id
            LEFT JOIN creators cr ON lower(cr.email) = lower(u.email)
            LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
            ORDER BY u.created_at DESC
            LIMIT 200
          `

      return send(res, 200, {
        users: rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          image: r.image,
          createdAt: r.created_at,
          isAdmin: r.is_admin,
          isCreator: r.is_creator,
          tier: r.tier || 'free',
        })),
      })
    }

    if (req.method === 'POST') {
      const { userId } = req.body || {}
      if (!userId) return send(res, 400, { error: 'userId is required' })

      const target = await sql`SELECT id, email FROM neon_auth."user" WHERE id = ${userId}`
      if (target.length === 0) return send(res, 404, { error: 'user not found' })

      await sql`
        INSERT INTO platform_admins (user_id, email, granted_by)
        VALUES (${userId}, ${target[0].email}, ${admin.id})
        ON CONFLICT (user_id) DO NOTHING
      `
      return send(res, 201, { ok: true })
    }

    if (req.method === 'DELETE') {
      const { userId } = req.query || {}
      if (!userId) return send(res, 400, { error: 'userId is required' })
      // Locking yourself out would leave the console reachable only by editing
      // ADMIN_EMAILS and redeploying.
      if (userId === admin.id) {
        return send(res, 400, { error: "You can't revoke your own admin access" })
      }
      await sql`DELETE FROM platform_admins WHERE user_id = ${userId}`
      return send(res, 200, { ok: true })
    }
  })
}
