import { sql } from '../db.js'
import { requireAdmin, logAdmin, STAFF_ROLES } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

/**
 * Every account, with whether they're a creator, an admin, and what they're
 * paying. Admin can be granted or revoked here, along with two things a full
 * admin can do to any account: comp a plan, and suspend it.
 *
 * GET     ?q=                                   all users (optionally filtered by name/email)
 * POST    { userId, role? }                     grant a staff role (default 'admin')
 * DELETE  ?userId=                               revoke it
 * PATCH   { userId, action:'grant-plan', tier, months? }   comp Standard/Express, months blank = indefinite
 * PATCH   { userId, action:'revoke-plan' }        take back a comped plan (a paid one is untouched)
 * PATCH   { userId, action:'suspend', reason? }   lock the account out of everything
 * PATCH   { userId, action:'unsuspend' }
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return

    // Sales and support may look people up (read-only); everything that
    // changes an account or who has access is for full admins.
    const admin = await requireAdmin(req, res, req.method === 'GET' ? ['sales', 'support'] : [])
    if (!admin) return

    if (req.method === 'GET') {
      const q = (req.query?.q || '').trim().toLowerCase()
      const like = `%${q}%`

      // The best active plan, real or comped, and whether the best one is a
      // comp: MAX by tier rank, preferring the admin-grant row on a tie so the
      // page can say "comped" rather than guessing from two joined rows.
      const rows = q
        ? await sql`
            SELECT u.id, u.name, u.email, u.image, u."createdAt" AS created_at,
                   u.banned, u."banReason" AS ban_reason,
                   (a.user_id IS NOT NULL) AS is_admin, a.role AS staff_role,
                   (cr.id IS NOT NULL) AS is_creator,
                   s.tier, s.status AS sub_status, s.provider AS sub_provider, s.current_period_end
            FROM neon_auth."user" u
            LEFT JOIN platform_admins a ON a.user_id = u.id
            LEFT JOIN creators cr ON lower(cr.email) = lower(u.email)
            LEFT JOIN LATERAL (
              SELECT tier, status, provider, current_period_end FROM subscriptions
              WHERE user_id = u.id AND organization_id IS NULL AND status = 'active'
              ORDER BY (provider = 'admin-grant') DESC,
                       CASE tier WHEN 'express' THEN 2 WHEN 'standard' THEN 1 ELSE 0 END DESC
              LIMIT 1
            ) s ON true
            WHERE lower(u.email) LIKE ${like} OR lower(COALESCE(u.name, '')) LIKE ${like}
            ORDER BY u."createdAt" DESC
            LIMIT 200
          `
        : await sql`
            SELECT u.id, u.name, u.email, u.image, u."createdAt" AS created_at,
                   u.banned, u."banReason" AS ban_reason,
                   (a.user_id IS NOT NULL) AS is_admin, a.role AS staff_role,
                   (cr.id IS NOT NULL) AS is_creator,
                   s.tier, s.status AS sub_status, s.provider AS sub_provider, s.current_period_end
            FROM neon_auth."user" u
            LEFT JOIN platform_admins a ON a.user_id = u.id
            LEFT JOIN creators cr ON lower(cr.email) = lower(u.email)
            LEFT JOIN LATERAL (
              SELECT tier, status, provider, current_period_end FROM subscriptions
              WHERE user_id = u.id AND organization_id IS NULL AND status = 'active'
              ORDER BY (provider = 'admin-grant') DESC,
                       CASE tier WHEN 'express' THEN 2 WHEN 'standard' THEN 1 ELSE 0 END DESC
              LIMIT 1
            ) s ON true
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
          isComped: r.sub_provider === 'admin-grant',
          planUntil: r.sub_provider === 'admin-grant' ? r.current_period_end : null,
          suspended: Boolean(r.banned),
          suspendReason: r.ban_reason || null,
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

    if (req.method === 'PATCH') {
      const { userId, action, tier, months, reason } = req.body || {}
      if (!userId) return send(res, 400, { error: 'userId is required' })
      const target = await sql`SELECT id, email FROM neon_auth."user" WHERE id = ${userId}`
      if (target.length === 0) return send(res, 404, { error: 'user not found' })
      const email = target[0].email

      if (action === 'grant-plan') {
        if (!['standard', 'express'].includes(tier)) return send(res, 400, { error: 'tier must be standard or express' })
        const n = Number(months)
        const until = Number.isFinite(n) && n > 0 ? new Date(Date.now() + n * 30 * 86400000).toISOString() : null
        await sql`DELETE FROM subscriptions WHERE user_id = ${userId} AND organization_id IS NULL AND provider = 'admin-grant'`
        await sql`
          INSERT INTO subscriptions (user_id, tier, billing_cycle, status, provider, current_period_end)
          VALUES (${userId}, ${tier}, 'monthly', 'active', 'admin-grant', ${until})
        `
        await logAdmin(admin, 'plan.grant', email, { tier, until })
        return send(res, 200, { ok: true })
      }

      if (action === 'revoke-plan') {
        await sql`DELETE FROM subscriptions WHERE user_id = ${userId} AND organization_id IS NULL AND provider = 'admin-grant'`
        await logAdmin(admin, 'plan.revoke', email)
        return send(res, 200, { ok: true })
      }

      if (action === 'suspend') {
        if (userId === admin.id) return send(res, 400, { error: "You can't suspend your own account" })
        await sql`UPDATE neon_auth."user" SET banned = true, "banReason" = ${String(reason || '').trim().slice(0, 300) || null} WHERE id = ${userId}`
        await logAdmin(admin, 'user.suspend', email, { reason: reason || null })
        return send(res, 200, { ok: true })
      }

      if (action === 'unsuspend') {
        await sql`UPDATE neon_auth."user" SET banned = false, "banReason" = NULL, "banExpires" = NULL WHERE id = ${userId}`
        await logAdmin(admin, 'user.unsuspend', email)
        return send(res, 200, { ok: true })
      }

      return send(res, 400, { error: `Unknown action: ${action}` })
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
