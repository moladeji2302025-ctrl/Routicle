import { sql } from '../db.js'
import { requireAdmin, logAdmin, STAFF_ROLES } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

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

    // Sales and support may look people up (read-only); everything that
    // changes an account or who has access is for full admins.
    const admin = await requireAdmin(req, res, req.method === 'GET' ? ['sales', 'support'] : [])
    if (!admin) return

    if (req.method === 'GET') {
      const q = (req.query?.q || '').trim().toLowerCase()
      const like = `%${q}%`

      const rows = q
        ? await sql`
            SELECT u.id, u.name, u.email, u.image, u."createdAt" AS created_at,
                   (a.user_id IS NOT NULL) AS is_admin, a.role AS staff_role,
                   (cr.id IS NOT NULL) AS is_creator,
                   s.tier, s.status AS sub_status
            FROM neon_auth."user" u
            LEFT JOIN platform_admins a ON a.user_id = u.id
            LEFT JOIN creators cr ON lower(cr.email) = lower(u.email)
            LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
            WHERE lower(u.email) LIKE ${like} OR lower(COALESCE(u.name, '')) LIKE ${like}
            ORDER BY u."createdAt" DESC
            LIMIT 200
          `
        : await sql`
            SELECT u.id, u.name, u.email, u.image, u."createdAt" AS created_at,
                   (a.user_id IS NOT NULL) AS is_admin, a.role AS staff_role,
                   (cr.id IS NOT NULL) AS is_creator,
                   s.tier, s.status AS sub_status
            FROM neon_auth."user" u
            LEFT JOIN platform_admins a ON a.user_id = u.id
            LEFT JOIN creators cr ON lower(cr.email) = lower(u.email)
            LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
            ORDER BY u."createdAt" DESC
            LIMIT 200
          `

      return send(res, 200, {
        users: rows.map((r) => ({
          id: r.id,
          name: r.name,
          image: r.image,
          createdAt: r.created_at,
          // Sales sees who someone is, never how to email them: prospecting is
          // done from the leads list, not from account addresses.
          email: admin.adminRole === 'sales' ? null : r.email,
          isAdmin: r.is_admin,
          staffRole: r.staff_role || null,
          isCreator: r.is_creator,
          tier: r.tier || 'free',
        })),
      })
    }

    if (req.method === 'POST') {
      const { userId, role: wanted } = req.body || {}
      if (!userId) return send(res, 400, { error: 'userId is required' })
      const role = wanted || 'admin'
      if (!STAFF_ROLES.includes(role)) return send(res, 400, { error: `role must be one of ${STAFF_ROLES.join(', ')}` })
      // Demoting yourself could leave nobody able to manage roles.
      if (userId === admin.id && role !== 'admin') return send(res, 400, { error: "You can't change your own role" })

      const target = await sql`SELECT id, email FROM neon_auth."user" WHERE id = ${userId}`
      if (target.length === 0) return send(res, 404, { error: 'user not found' })

      await sql`
        INSERT INTO platform_admins (user_id, email, granted_by, role)
        VALUES (${userId}, ${target[0].email}, ${admin.id}, ${role})
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role
      `
      await logAdmin(admin, 'role.set', target[0].email, { role })
      return send(res, 201, { ok: true, role })
    }

    if (req.method === 'DELETE') {
      const { userId } = req.query || {}
      if (!userId) return send(res, 400, { error: 'userId is required' })
      // Locking yourself out would leave the console reachable only by editing
      // ADMIN_EMAILS and redeploying.
      if (userId === admin.id) {
        return send(res, 400, { error: "You can't revoke your own admin access" })
      }
      const gone = await sql`DELETE FROM platform_admins WHERE user_id = ${userId} RETURNING email`
      await logAdmin(admin, 'role.revoke', gone[0]?.email || userId)
      return send(res, 200, { ok: true })
    }
  })
}
