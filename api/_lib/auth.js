import { sql } from './db.js'
import { send } from './http.js'

/**
 * Server-side session verification.
 *
 * Neon Auth is Managed Better Auth, so the session is a signed cookie its own
 * service issued. Rather than re-implement that verification, this forwards the
 * request's cookie header to Better Auth's own /get-session and trusts only
 * what it returns. The browser can lie about a userId in a body; it cannot
 * forge a session cookie.
 *
 * Everything under /api/admin/* goes through requireAdmin(). The rest of the
 * API still trusts caller-supplied ids — that is a known gap, but it is not one
 * that should extend to endpoints which can change the platform for everyone.
 */

const AUTH_BASE = process.env.VITE_NEON_AUTH_URL || process.env.NEON_AUTH_URL

export async function getSession(req) {
  if (!AUTH_BASE) throw new Error('VITE_NEON_AUTH_URL is not set — session checks cannot run')
  const cookie = req.headers?.cookie
  if (!cookie) return null

  const res = await fetch(`${AUTH_BASE.replace(/\/$/, '')}/get-session`, {
    headers: { cookie, accept: 'application/json' },
  })
  if (!res.ok) return null

  const data = await res.json().catch(() => null)
  // Better Auth answers 200 with an empty body when there is no live session.
  return data?.user ? { user: data.user, session: data.session } : null
}

/**
 * Admins come from two places: an ADMIN_EMAILS allowlist that bootstraps the
 * first one (there is no way to grant admin before an admin exists), and the
 * platform_admins table for everyone granted since.
 */
function bootstrapEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function isAdminUser(user) {
  if (!user) return false
  const email = (user.email || '').toLowerCase()
  if (email && bootstrapEmails().includes(email)) return true

  const rows = await sql`SELECT 1 FROM platform_admins WHERE user_id = ${user.id} LIMIT 1`
  return rows.length > 0
}

/** Resolves to the session user, or sends 401 and resolves to null. */
export async function requireUser(req, res) {
  const session = await getSession(req)
  if (!session) {
    send(res, 401, { error: 'Sign in required' })
    return null
  }
  return session.user
}

/** Resolves to the session user when they are an admin, or sends 401/403 and resolves to null. */
export async function requireAdmin(req, res) {
  const user = await requireUser(req, res)
  if (!user) return null
  if (!(await isAdminUser(user))) {
    send(res, 403, { error: 'Admin access required' })
    return null
  }
  return user
}
