import { sql } from './db.js'
import { send } from './http.js'

/**
 * Server-side session verification.
 *
 * Neon Auth is hosted on its own domain (…neonauth.…aws.neon.tech), so its
 * session cookie is scoped there and is *never* sent to this app's origin —
 * reading req.headers.cookie here always comes up empty. Instead the client
 * sends the session token it already holds as a bearer header, and this
 * verifies it against neon_auth.session, which is the same table Neon Auth
 * itself checks.
 *
 * The token is a bearer credential: it only ever travels same-origin over
 * HTTPS, and is held in memory client-side rather than localStorage.
 *
 * Everything under /api/admin/* goes through requireAdmin(). The rest of the
 * API still trusts caller-supplied ids — a known gap, but not one that should
 * extend to endpoints which can change the platform for everyone.
 */

function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (!header || !/^Bearer\s+/i.test(header)) return null
  const token = header.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

export async function getSession(req) {
  const token = bearerToken(req)
  if (!token) return null

  const rows = await sql`
    SELECT u.id, u.email, u.name, u.image, s."expiresAt"
    FROM neon_auth.session s
    JOIN neon_auth."user" u ON u.id = s."userId"
    WHERE s.token = ${token} AND s."expiresAt" > now()
    LIMIT 1
  `
  if (rows.length === 0) return null

  const r = rows[0]
  return { user: { id: r.id, email: r.email, name: r.name, image: r.image } }
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
