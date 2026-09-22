import { sql } from '../db.js'
import { requireAdmin } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

/**
 * The Activity log: who changed what in the console. Full admins only.
 *
 * GET ?limit=   newest first
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return
    const admin = await requireAdmin(req, res)
    if (!admin) return

    const limit = Math.min(200, Math.max(1, Number(req.query?.limit) || 100))
    const rows = await sql`
      SELECT id, actor_email, action, target, detail, created_at
      FROM admin_audit_log ORDER BY created_at DESC LIMIT ${limit}
    `
    send(res, 200, {
      entries: rows.map((r) => ({
        id: r.id,
        actor: r.actor_email,
        action: r.action,
        target: r.target,
        detail: r.detail,
        at: r.created_at,
      })),
    })
  })
}
