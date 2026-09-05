import { importJWK, jwtVerify, decodeProtectedHeader } from 'jose'
import { sql } from './db.js'
import { send } from './http.js'

/**
 * Server-side session verification.
 *
 * Neon Auth is hosted on its own domain, so its session cookie is scoped there
 * and never reaches this app's origin — req.headers.cookie on a Vercel function
 * is always empty for it, and the session token itself is httpOnly so the
 * browser can't read it either.
 *
 * What the browser *can* do is ask Neon Auth for a signed JWT (its /token
 * endpoint, which requires a live session) and send that here as a bearer
 * token. Neon Auth signs those with a key it keeps in neon_auth.jwks — the same
 * database this app already connects to — so the signature is verified locally
 * against the public key. Nothing is trusted on the client's word: a forged or
 * expired token fails the signature or the exp check.
 *
 * Everything under /api/admin/* goes through requireAdmin(). The rest of the
 * API still trusts caller-supplied ids — a known gap, but not one that should
 * extend to endpoints which can change the platform for everyone.
 */

// Signing keys rotate rarely; caching across warm invocations avoids a query
// per request, and a `kid` miss falls through to a re-read below.
let keyCache = new Map()

async function loadKeys() {
  const rows = await sql`SELECT id, "publicKey" FROM neon_auth.jwks`
  const next = new Map()
  for (const row of rows) {
    try {
      const jwk = typeof row.publicKey === 'string' ? JSON.parse(row.publicKey) : row.publicKey
      // Neon Auth stores the bare JWK; `alg` is required to import an OKP key.
      next.set(row.id, await importJWK({ alg: 'EdDSA', ...jwk }, 'EdDSA'))
    } catch (err) {
      console.error('skipping unreadable JWK', row.id, err.message)
    }
  }
  keyCache = next
  return next
}

async function keyFor(kid) {
  if (keyCache.has(kid)) return keyCache.get(kid)
  const keys = await loadKeys()
  if (kid && keys.has(kid)) return keys.get(kid)
  // No kid on the header (or an unknown one) — fall back to the only key when
  // there is exactly one, which is the normal single-key case.
  return keys.size === 1 ? [...keys.values()][0] : null
}

function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (!header || !/^Bearer\s+/i.test(header)) return null
  return header.replace(/^Bearer\s+/i, '').trim() || null
}

export async function getSession(req) {
  const token = bearerToken(req)
  if (!token) return null

  try {
    const { kid } = decodeProtectedHeader(token)
    const key = await keyFor(kid)
    if (!key) {
      console.error('no verification key available for kid', kid)
      return null
    }

    // jwtVerify enforces the signature and the exp/nbf claims.
    const { payload } = await jwtVerify(token, key)
    const userId = payload.sub || payload.id
    if (!userId) return null

    // Read identity from our own tables rather than the token body, so a claim
    // set that drifts from the database can't grant access to the wrong row.
    const rows = await sql`SELECT id, email, name, image FROM neon_auth."user" WHERE id = ${userId} LIMIT 1`
    if (rows.length === 0) return null

    return { user: rows[0] }
  } catch (err) {
    // Expired or tampered tokens land here; that's a normal 401, not a fault.
    if (err?.code !== 'ERR_JWT_EXPIRED') console.error('JWT verification failed:', err.message)
    return null
  }
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
